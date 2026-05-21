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

import { cleanTranscript } from "@/app/lib/transcriptCleaner";

import { computeTranscriptStats } from "@/app/lib/transcriptStats";

import { VapiSessionManager } from "@/app/lib/vapi/VapiSessionManager";

import {
  formatVapiError,
  getVapiEnv,
  logVapi,
  validateVapiConfig,
} from "@/app/lib/vapiConfig";

import { extractRecruiterSignals } from "@/app/lib/recruiterSignal";

import type {
  EvaluateResponse,
  InterviewPhase,
  ParsedEvaluation,
  TranscriptMessage,
  TranscriptStats,
} from "@/app/types/interview";

function createMessageId(): string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
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

  const isStartingRef =
    useRef(false);

  const recruiterMemoryRef = useRef({
    candidateName: "",
    discussedTopics: [] as string[],
    weakAreas: [] as string[],
    strongAreas: [] as string[],
    followUpsAsked: [] as string[],
  });

  const transcriptRef = useRef("");

  const messagesRef = useRef<
    TranscriptMessage[]
  >([]);

  const lastTranscriptRef =
    useRef("");

  const callStartRef = useRef<
    number | null
  >(null);

  const durationIntervalRef =
    useRef<
      ReturnType<
        typeof setInterval
      > | null
    >(null);

  const stepIntervalRef = useRef<
    ReturnType<
      typeof setInterval
    > | null
  >(null);

  const mountedRef =
    useRef(true);

  const phaseRef =
    useRef<InterviewPhase>(
      clientConfig.ok
        ? "idle"
        : "error"
    );

  const durationSecondsRef =
    useRef(0);

  const endInFlightRef =
    useRef(false);

  const callStartedRef =
    useRef(false);

  const [phase, setPhase] =
    useState<InterviewPhase>(() =>
      clientConfig.ok
        ? "idle"
        : "error"
    );

  const [messages, setMessages] =
    useState<
      TranscriptMessage[]
    >([]);

  const [evaluation, setEvaluation] =
    useState("");

  const [
    parsedEvaluation,
    setParsedEvaluation,
  ] = useState<ParsedEvaluation | null>(
    null
  );

  const [error, setError] =
    useState<string | null>(() =>
      clientConfig.ok
        ? null
        : clientConfig.errors.join(" ")
    );

  const [
    durationSeconds,
    setDurationSeconds,
  ] = useState(0);

  const [
    analyzingStep,
    setAnalyzingStep,
  ] = useState(0);

  const [stats, setStats] =
    useState<TranscriptStats | null>(
      null
    );

  const [voiceReady, setVoiceReady] =
    useState(false);

  const setPhaseSafe =
    useCallback(
      (next: InterviewPhase) => {
        phaseRef.current = next;
        setPhase(next);
      },
      []
    );

  const clearTimers =
    useCallback(() => {
      if (
        durationIntervalRef.current
      ) {
        clearInterval(
          durationIntervalRef.current
        );

        durationIntervalRef.current =
          null;
      }

      if (stepIntervalRef.current) {
        clearInterval(
          stepIntervalRef.current
        );

        stepIntervalRef.current =
          null;
      }
    }, []);

  const startDurationTimer =
    useCallback(() => {
      callStartRef.current =
        Date.now();

      if (
        durationIntervalRef.current
      ) {
        clearInterval(
          durationIntervalRef.current
        );
      }

      durationIntervalRef.current =
        setInterval(() => {
          if (!callStartRef.current)
            return;

          const next =
            Math.floor(
              (Date.now() -
                callStartRef.current) /
                1000
            );

          durationSecondsRef.current =
            next;

          setDurationSeconds(next);
        }, 1000);
    }, []);

  const runAnalyzingSteps =
    useCallback(() => {
      setAnalyzingStep(0);

      if (stepIntervalRef.current) {
        clearInterval(
          stepIntervalRef.current
        );
      }

      stepIntervalRef.current =
        setInterval(() => {
          setAnalyzingStep(
            (prev) =>
              prev <
              ANALYZING_STEPS.length -
                1
                ? prev + 1
                : prev
          );
        }, 1400);
    }, []);

  const processTranscriptChunk =
    useCallback(
      (
        role: string,
        text: string
      ) => {
        const cleaned = text
          .replace(/\s+/g, " ")
          .trim();

        if (
          !cleaned ||
          cleaned.length <
            MIN_TRANSCRIPT_CHUNK_LENGTH
        ) {
          return;
        }

        const normalized =
          cleaned.toLowerCase();

        const previous =
          lastTranscriptRef.current.toLowerCase();

        if (
          normalized === previous
        ) {
          return;
        }

        const signals =
          extractRecruiterSignals(
            cleaned
          );

        recruiterMemoryRef.current.strongAreas.push(
          ...signals.strongSignals
        );

        recruiterMemoryRef.current.weakAreas.push(
          ...signals.weakSignals
        );

        setMessages((prev) => {
          const next = [
            ...prev,
            {
              id: createMessageId(),
              role,
              transcript: cleaned,
              timestamp:
                Date.now(),
            },
          ];

          messagesRef.current =
            next;

          return next;
        });

        lastTranscriptRef.current =
          cleaned;
      },
      []
    );

  const fetchEvaluation =
    useCallback(async () => {
      const cleanedTranscript =
        cleanTranscript(
          transcriptRef.current
        );

      const wordCount =
        cleanedTranscript
          .split(/\s+/)
          .filter(Boolean).length;

      if (!cleanedTranscript) {
        setPhaseSafe("error");

        setError(
          "No transcript captured."
        );

        return;
      }

      if (wordCount < 25) {
        setPhaseSafe("complete");
        clearTimers();
        endInFlightRef.current =
          false;
        return;
      }

      try {
        const duration =
          durationSecondsRef.current;

        const statsSnapshot =
          computeTranscriptStats(
            messagesRef.current,
            duration
          );

        const {
          response,
          data,
        } =
          await fetchWithTimeout<EvaluateResponse>(
            "/api/evaluate",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                {
                  transcript:
                    cleanedTranscript,

                  meta: {
                    durationSeconds:
                      duration,

                    candidateTurns:
                      statsSnapshot.candidateTurns,

                    candidateWordShare:
                      statsSnapshot.candidateWordShare,

                    lineCount:
                      statsSnapshot.lineCount,
                  },
                }
              ),

              timeoutMs:
                EVALUATE_TIMEOUT_MS,
            }
          );

        if (
          !response.ok ||
          !data.ok
        ) {
          throw new Error(
            data.error ??
              "Evaluation failed."
          );
        }

        if (!mountedRef.current)
          return;

        setEvaluation(
          data.evaluation ?? ""
        );

        setParsedEvaluation(
          data.parsed ?? null
        );

        setStats(statsSnapshot);

        setPhaseSafe("complete");
      } catch (err) {
        if (!mountedRef.current)
          return;

        if (
          err instanceof
          FetchTimeoutError
        ) {
          setError(
            "Evaluation timed out."
          );
        } else {
          setError(
            "Evaluation failed."
          );
        }

        setPhaseSafe("error");
      } finally {
        clearTimers();

        endInFlightRef.current =
          false;
      }
    }, [clearTimers, setPhaseSafe]);

  useEffect(() => {
    if (!clientConfig.ok)
      return;

    mountedRef.current = true;

    const manager =
      sessionManagerRef.current;

    manager.mount();

    const handleCallStart = () => {
      manager.clearConnectTimeout();

      if (
        callStartedRef.current
      ) {
        return;
      }

      callStartedRef.current =
        true;

      setError(null);

      setPhaseSafe("active");

      startDurationTimer();
    };

    const handleMessage = (
      message: Record<
        string,
        unknown
      >
    ) => {
      if (
        message.type !==
        "transcript"
      ) {
        return;
      }

      if (
        phaseRef.current !==
        "active"
      ) {
        return;
      }

      const text = String(
        message.transcript ??
          message.text ??
          ""
      )
        .replace(/\s+/g, " ")
        .trim();

      const role = String(
        message.role ?? "Speaker"
      );

      processTranscriptChunk(
        role,
        text
      );

      transcriptRef.current =
        messagesRef.current
          .map(
            (m) =>
              `${m.role}: ${m.transcript}`
          )
          .join("\n");
    };

    const handleCallEnd = () => {
      if (
        endInFlightRef.current
      ) {
        return;
      }

      if (
        phaseRef.current !==
        "active"
      ) {
        return;
      }

      endInFlightRef.current =
        true;

      clearTimers();

      setPhaseSafe(
        "processing"
      );

      runAnalyzingSteps();

      setTimeout(() => {
        void fetchEvaluation();
      }, 1200);
    };

    const handleError = (
      err: unknown
    ) => {
      const message =
        formatVapiError(err);

      const normalized =
        JSON.stringify(err).toLowerCase();

      if (
        normalized.includes(
          "meeting has ended"
        ) ||
        normalized.includes(
          "no-room"
        ) ||
        normalized.includes(
          "room was deleted"
        ) ||
        normalized.includes(
          "krisp"
        )
      ) {
        return;
      }

      logVapi(
        "error",
        "runtime-error",
        {
          message,
          raw: err,
        }
      );

      setError(message);

      setPhaseSafe("error");
    };

    void manager
      .ensureClient(
        clientConfig.publicKey
      )
      .then(() => {
        manager.attachHandlers({
          onCallStart:
            handleCallStart,

          onMessage:
            handleMessage,

          onCallEnd:
            handleCallEnd,

          onError:
            handleError,
        });

        setVoiceReady(true);
      });

    return () => {
      mountedRef.current =
        false;

      clearTimers();

      void manager.stopCall(
        "component-unmount"
      );

      manager.detachHandlers();

      manager.unmount();
    };
  }, []);

  const startCall =
    useCallback(async () => {
      if (!voiceReady)
        return;

      if (
        isStartingRef.current
      ) {
        return;
      }

      isStartingRef.current =
        true;

      const manager =
        sessionManagerRef.current;

      const { assistantId } =
        getVapiEnv();

      setError(null);

      setEvaluation("");

      setParsedEvaluation(null);

      transcriptRef.current = "";

      messagesRef.current = [];

      durationSecondsRef.current = 0;

      lastTranscriptRef.current =
        "";

      setMessages([]);

      setDurationSeconds(0);

      callStartedRef.current =
        false;

      endInFlightRef.current =
        false;

      setPhaseSafe("connecting");

      manager.beginConnectTimeout(
        () => {
          console.error(
            "Vapi connection timeout"
          );

          void manager.stopCall(
            "connect-timeout"
          );

          setPhaseSafe("error");

          setError(
            "Voice connection timeout."
          );
        }
      );

      try {
        await manager.startCall(
          assistantId
        );
      } catch (err) {
        setError(
          formatVapiError(err)
        );

        setPhaseSafe("error");
      } finally {
        isStartingRef.current =
          false;
      }
    }, [setPhaseSafe, voiceReady]);

  const endCall =
    useCallback(() => {
      if (
        phaseRef.current !==
        "active"
      ) {
        return;
      }

      if (
        endInFlightRef.current
      ) {
        return;
      }

      endInFlightRef.current =
        true;

      setPhaseSafe(
        "processing"
      );

      runAnalyzingSteps();

      clearTimers();

      void sessionManagerRef.current
        .stopCall("manual-end")
        .then(() => {
          setTimeout(() => {
            void fetchEvaluation();
          }, 1200);
        });
    }, [
      clearTimers,
      fetchEvaluation,
      runAnalyzingSteps,
      setPhaseSafe,
    ]);

  const retryEvaluation =
    useCallback(async () => {
      setError(null);

      setEvaluation("");

      setParsedEvaluation(null);

      setPhaseSafe(
        "processing"
      );

      runAnalyzingSteps();

      await fetchEvaluation();
    }, [
      fetchEvaluation,
      runAnalyzingSteps,
      setPhaseSafe,
    ]);

  return {
    phase,

    messages,

    evaluation,

    parsedEvaluation,

    error,

    durationSeconds,

    analyzingStep,

    analyzingSteps:
      ANALYZING_STEPS,

    stats,

    voiceReady,

    isCallActive:
      phase === "active" ||
      phase === "connecting",

    startCall,

    endCall,

    retryEvaluation,
  };
}