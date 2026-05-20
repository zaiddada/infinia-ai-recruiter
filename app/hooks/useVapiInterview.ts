"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ANALYZING_STEPS,
  EVALUATE_TIMEOUT_MS,
  MIN_TRANSCRIPT_CHUNK_LENGTH,
} from "@/app/lib/constants";
import {
  fetchWithTimeout,
  FetchTimeoutError,
} from "@/app/lib/fetchWithTimeout";
import { mergeTranscriptLine } from "@/app/lib/transcriptCleaner";
import { computeTranscriptStats } from "@/app/lib/transcriptStats";
import { VapiSessionManager } from "@/app/lib/vapi/VapiSessionManager";
import {
  formatVapiError,
  getVapiEnv,
  logVapi,
  validateVapiConfig,
} from "@/app/lib/vapiConfig";
import type {
  EvaluateResponse,
  InterviewPhase,
  ParsedEvaluation,
  TranscriptMessage,
  TranscriptStats,
} from "@/app/types/interview";

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function extractVapiFailureMessage(
  event: unknown
): string | null {
  if (!event || typeof event !== "object") {
    return null;
  }

  const record = event as Record<string, unknown>;
  const errorField = record.error;

  if (typeof errorField === "string") {
    return errorField;
  }

  if (errorField && typeof errorField === "object") {
    const nested = errorField as Record<string, unknown>;
    if (typeof nested.message === "string") {
      return nested.message;
    }
  }

  return null;
}

function isNormalCallTermination(
  message: string
): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("meeting has ended") ||
    normalized.includes("ejected") ||
    normalized.includes("call ended") ||
    normalized.includes("no-room")
  );
}

const TERMINAL_PHASES: InterviewPhase[] = [
  "processing",
  "complete",
];

export function useVapiInterview() {
  const clientConfig = useMemo(
    () => validateVapiConfig(),
    []
  );
  const sessionManagerRef = useRef(
    VapiSessionManager.getInstance()
  );

  const transcriptRef = useRef("");
  const messagesRef = useRef<TranscriptMessage[]>([]);
  const callStartRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const stepIntervalRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const mountedRef = useRef(true);
  const phaseRef = useRef<InterviewPhase>(
    clientConfig.ok ? "idle" : "error"
  );
  const hasEvaluatedRef = useRef(false);
  const startInFlightRef = useRef(false);
  const endInFlightRef = useRef(false);
  const callStartedRef = useRef(false);

  const [phase, setPhase] = useState<InterviewPhase>(() =>
    clientConfig.ok ? "idle" : "error"
  );
  const [messages, setMessages] = useState<TranscriptMessage[]>(
    []
  );
  const [evaluation, setEvaluation] = useState("");
  const [parsedEvaluation, setParsedEvaluation] =
    useState<ParsedEvaluation | null>(null);
  const [error, setError] = useState<string | null>(() =>
    clientConfig.ok ? null : clientConfig.errors.join(" ")
  );
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const [stats, setStats] = useState<TranscriptStats | null>(
    null
  );
  const [voiceReady, setVoiceReady] = useState(false);

  const setPhaseSafe = useCallback((next: InterviewPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const clearTimers = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
      stepIntervalRef.current = null;
    }
  }, []);

  const resetTranscriptState = useCallback(() => {
    transcriptRef.current = "";
    messagesRef.current = [];
    callStartRef.current = null;
    setMessages([]);
    setDurationSeconds(0);
  }, []);

  const startDurationTimer = useCallback(() => {
    callStartRef.current = Date.now();

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    durationIntervalRef.current = setInterval(() => {
      if (!callStartRef.current) {
        return;
      }
      setDurationSeconds(
        Math.floor(
          (Date.now() - callStartRef.current) / 1000
        )
      );
    }, 1000);
  }, []);

  const runAnalyzingSteps = useCallback(() => {
    setAnalyzingStep(0);
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
    }
    stepIntervalRef.current = setInterval(() => {
      setAnalyzingStep((prev) =>
        prev < ANALYZING_STEPS.length - 1 ? prev + 1 : prev
      );
    }, 1400);
  }, []);

  const applyVoiceError = useCallback(
    (message: string) => {
      if (
        TERMINAL_PHASES.includes(phaseRef.current)
      ) {
        logVapi("warn", "error-after-terminal-phase", {
          phase: phaseRef.current,
          message,
        });
        return;
      }

      sessionManagerRef.current.clearConnectTimeout();
      startInFlightRef.current = false;
      callStartedRef.current = false;
      setPhaseSafe("error");
      setError(message);
    },
    [setPhaseSafe]
  );

  const fetchEvaluation = useCallback(
    async (
      rawTranscript: string,
      meta?: {
        durationSeconds?: number;
        candidateWordCount?: number;
        candidateTurns?: number;
        candidateWordShare?: number;
        lineCount?: number;
      }
    ) => {
      const transcript = rawTranscript.trim();

      if (!transcript) {
        setPhaseSafe("error");
        setError("No interview transcript was captured.");
        setEvaluation("No transcript found after processing.");
        endInFlightRef.current = false;
        clearTimers();
        return;
      }

      try {
        const { response, data } =
          await fetchWithTimeout<EvaluateResponse>(
            "/api/evaluate",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ transcript, meta }),
              timeoutMs: EVALUATE_TIMEOUT_MS,
            }
          );

        if (!mountedRef.current) {
          return;
        }

        if (!response.ok || data.ok === false) {
          setPhaseSafe("error");
          setError(data.error ?? "Evaluation failed.");
          setEvaluation(
            data.evaluation ??
              data.error ??
              "Failed to generate evaluation."
          );
          return;
        }

        setEvaluation(data.evaluation ?? "");
        if (data.parsed) {
          setParsedEvaluation(data.parsed);
        }

        if (
          data.persistStatus === "failed" &&
          data.dbConfigured
        ) {
          logVapi("warn", "evaluate-persist-failed-background", {
            persistStatus: data.persistStatus,
          });
        }

        setPhaseSafe("complete");
      } catch (err) {
        if (!mountedRef.current) {
          return;
        }

        setPhaseSafe("error");

        if (err instanceof FetchTimeoutError) {
          setError(
            "Evaluation timed out. Please try again."
          );
          setEvaluation(
            "The AI recruiter took too long to respond. Please retry."
          );
        } else {
          setError(
            "Network error while generating evaluation."
          );
          setEvaluation(
            "Failed to generate evaluation. Check your connection."
          );
        }
      } finally {
        endInFlightRef.current = false;
        clearTimers();
      }
    },
    [clearTimers, setPhaseSafe]
  );

  useEffect(() => {
    if (!clientConfig.ok) {
      return;
    }

    mountedRef.current = true;
    const manager = sessionManagerRef.current;
    manager.mount();

    logVapi("info", "config-check", {
      hasPublicKey: Boolean(clientConfig.publicKey),
      hasAssistantId: Boolean(clientConfig.assistantId),
      valid: clientConfig.ok,
    });

    let cancelled = false;

    const handleCallStart = () => {
      if (callStartedRef.current) {
        logVapi("warn", "duplicate-call-start-ignored");
        return;
      }

      callStartedRef.current = true;
      manager.clearConnectTimeout();
      startInFlightRef.current = false;
      endInFlightRef.current = false;
      hasEvaluatedRef.current = false;
      resetTranscriptState();
      setError(null);
      setPhaseSafe("active");
      startDurationTimer();
      logVapi("info", "call-start");
    };

    const handleMessage = (
      message: Record<string, unknown>
    ) => {
      if (message.type !== "transcript") {
        return;
      }
      if (
        phaseRef.current !== "active" ||
        endInFlightRef.current
      ) {
        return;
      }

      const text = String(
        message.transcript ?? message.text ?? ""
      ).trim();

      if (
        !text ||
        text.length < MIN_TRANSCRIPT_CHUNK_LENGTH
      ) {
        return;
      }

      const role = String(message.role ?? "Speaker");
      const previousTranscript = transcriptRef.current;
      const previousLineCount = previousTranscript
        .split("\n")
        .filter(Boolean).length;
      const merged = mergeTranscriptLine(
        previousTranscript,
        text
      );
      const nextLineCount = merged
        .split("\n")
        .filter(Boolean).length;
      const isPartialUpdate =
        nextLineCount === previousLineCount &&
        previousLineCount > 0;

      transcriptRef.current = merged;

      setMessages((prevMessages) => {
        let nextMessages: TranscriptMessage[];

        if (
          isPartialUpdate &&
          prevMessages.length > 0
        ) {
          nextMessages = [...prevMessages];
          nextMessages[nextMessages.length - 1] = {
            ...nextMessages[nextMessages.length - 1],
            transcript: text,
          };
        } else {
          nextMessages = [
            ...prevMessages,
            {
              id: createMessageId(),
              role,
              transcript: text,
              timestamp: Date.now(),
            },
          ];
        }

        messagesRef.current = nextMessages;
        return nextMessages;
      });
    };

    const handleCallEnd = () => {
      logVapi("info", "call-end", {
        phase: phaseRef.current,
      });

      manager.clearConnectTimeout();
      startInFlightRef.current = false;
      callStartedRef.current = false;

      if (endInFlightRef.current) {
        return;
      }

      const currentPhase = phaseRef.current;

      if (currentPhase === "connecting") {
        clearTimers();
        setPhaseSafe("error");
        setError(
          "The voice session ended before connecting. Check your Vapi keys and microphone, then try again."
        );
        return;
      }

      if (currentPhase === "active") {
        clearTimers();
        setPhaseSafe("idle");
        setError(
          "The interview ended unexpectedly. Start a new session or use End & analyze before disconnecting."
        );
      }
    };

    const handleError = (vapiError: unknown) => {
      const message = formatVapiError(vapiError);

      if (isNormalCallTermination(message)) {
        logVapi("info", "normal-call-end", { message });
        return;
      }

      if (
        TERMINAL_PHASES.includes(phaseRef.current) ||
        endInFlightRef.current
      ) {
        logVapi("warn", "ignored-teardown-error", {
          phase: phaseRef.current,
          message,
        });
        return;
      }

      logVapi("error", "runtime-error", {
        message,
        raw: vapiError,
      });

      applyVoiceError(message);
    };

    const handleCallStartFailed = (
      event: unknown
    ) => {
      const detail =
        extractVapiFailureMessage(event) ??
        "Call failed to start. Verify your assistant is published and API keys are correct.";
      logVapi("error", "call-start-failed", {
        event,
        detail,
      });
      applyVoiceError(
        formatVapiError(new Error(detail))
      );
    };

    void manager
      .ensureClient(clientConfig.publicKey)
      .then(() => {
        if (cancelled || !mountedRef.current) {
          return;
        }

        manager.attachHandlers({
          onCallStart: handleCallStart,
          onMessage: handleMessage,
          onCallEnd: handleCallEnd,
          onError: handleError,
          onCallStartFailed: handleCallStartFailed,
        });
        setVoiceReady(true);
        logVapi("info", "handlers-attached");
      })
      .catch((err) => {
        if (!mountedRef.current) {
          return;
        }
        setVoiceReady(false);
        applyVoiceError(formatVapiError(err));
      });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      clearTimers();
      setVoiceReady(false);
      manager.unmount();
    };
  }, [
    applyVoiceError,
    clearTimers,
    clientConfig,
    resetTranscriptState,
    setPhaseSafe,
    startDurationTimer,
  ]);

  const startCall = useCallback(async () => {
    if (!clientConfig.ok) {
      setPhaseSafe("error");
      setError(clientConfig.errors.join(" "));
      return;
    }

    const manager = sessionManagerRef.current;

    if (!voiceReady || !manager.isClientReady()) {
      setPhaseSafe("error");
      setError(
        "Voice client is still initializing. Wait a moment and try again."
      );
      return;
    }

    if (startInFlightRef.current) {
      return;
    }

    const current = phaseRef.current;
    if (
      current === "connecting" ||
      current === "active" ||
      current === "processing"
    ) {
      return;
    }

    startInFlightRef.current = true;
    callStartedRef.current = false;
    setError(null);
    setPhaseSafe("connecting");

    const { assistantId } = getVapiEnv();

    manager.beginConnectTimeout(() => {
      if (callStartedRef.current) {
        return;
      }
      logVapi("error", "connect-timeout");
      void manager.stopCall("connect-timeout");
      applyVoiceError(
        "Connecting timed out. Refresh the page, confirm Vapi credentials, and use http://localhost:3000."
      );
    });

    try {
      logVapi("info", "start-requested", {
        assistantId,
        publicKeyPrefix: clientConfig.publicKey.slice(0, 8),
      });

      await manager.startCall(assistantId);
      logVapi("info", "start-invoked");
    } catch (err) {
      manager.clearConnectTimeout();
      const message = formatVapiError(err);
      logVapi("error", "start-failed", { message, error: err });
      startInFlightRef.current = false;
      await manager.stopCall("start-failed");
      applyVoiceError(message);
    }
  }, [applyVoiceError, clientConfig, setPhaseSafe, voiceReady]);

  const endCall = useCallback(() => {
    const manager = sessionManagerRef.current;

    if (!manager.isClientReady()) {
      return;
    }

    if (endInFlightRef.current) {
      return;
    }

    if (phaseRef.current !== "active") {
      return;
    }

    if (hasEvaluatedRef.current) {
      return;
    }

    endInFlightRef.current = true;
    hasEvaluatedRef.current = true;
    manager.clearConnectTimeout();
    clearTimers();

    const finalDuration = callStartRef.current
      ? Math.floor(
          (Date.now() - callStartRef.current) / 1000
        )
      : 0;

    const transcriptSnapshot = transcriptRef.current;
    const statsSnapshot = computeTranscriptStats(
      messagesRef.current,
      finalDuration
    );

    setDurationSeconds(finalDuration);
    setStats(statsSnapshot);
    setPhaseSafe("processing");
    runAnalyzingSteps();

    void fetchEvaluation(transcriptSnapshot, {
      durationSeconds: finalDuration,
      candidateWordCount: Math.round(
        statsSnapshot.wordCount *
          (statsSnapshot.candidateWordShare / 100)
      ),
      candidateTurns: statsSnapshot.candidateTurns,
      candidateWordShare: statsSnapshot.candidateWordShare,
      lineCount: statsSnapshot.lineCount,
    });

    void manager.stopCall("user-end");
  }, [
    clearTimers,
    fetchEvaluation,
    runAnalyzingSteps,
    setPhaseSafe,
  ]);

  const retryEvaluation = useCallback(async () => {
    if (!transcriptRef.current.trim()) {
      setError("No transcript available to re-evaluate.");
      return;
    }

    clearTimers();
    setError(null);
    setEvaluation("");
    setParsedEvaluation(null);
    setPhaseSafe("processing");
    runAnalyzingSteps();
    endInFlightRef.current = true;

    await fetchEvaluation(
      transcriptRef.current,
      stats
        ? {
            durationSeconds: stats.durationSeconds,
            candidateWordCount: Math.round(
              stats.wordCount *
                (stats.candidateWordShare / 100)
            ),
            candidateTurns: stats.candidateTurns,
            candidateWordShare: stats.candidateWordShare,
            lineCount: stats.lineCount,
          }
        : undefined
    );
  }, [
    clearTimers,
    fetchEvaluation,
    runAnalyzingSteps,
    setPhaseSafe,
    stats,
  ]);

  const isCallActive =
    phase === "active" || phase === "connecting";

  return {
    phase,
    messages,
    evaluation,
    parsedEvaluation,
    error,
    durationSeconds,
    analyzingStep,
    analyzingSteps: ANALYZING_STEPS,
    stats,
    isCallActive,
    voiceReady,
    startCall,
    endCall,
    retryEvaluation,
  };
}
