"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

import {
  ANALYZING_STEPS,
  EVALUATE_TIMEOUT_MS,
  MIN_TRANSCRIPT_CHUNK_LENGTH,
  VAPI_ASSISTANT_ID,
} from "@/app/lib/constants";
import {
  fetchWithTimeout,
  FetchTimeoutError,
} from "@/app/lib/fetchWithTimeout";
import { mergeTranscriptLine } from "@/app/lib/transcriptCleaner";
import { computeTranscriptStats } from "@/app/lib/transcriptStats";
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

function scheduleIdleTask(
  fn: () => void
): void {
  if (
    typeof requestIdleCallback ===
    "function"
  ) {
    requestIdleCallback(fn, {
      timeout: 2000,
    });
  } else {
    setTimeout(fn, 0);
  }
}

function isHarmlessTeardownError(
  error: unknown
): boolean {
  const message =
    error instanceof Error
      ? error.message
      : String(error ?? "");

  return (
    message.includes(
      "WASM_OR_WORKER_NOT_READY"
    ) ||
    message.includes(
      "Meeting has ended"
    ) ||
    message
      .toLowerCase()
      .includes("krisp")
  );
}

export function useVapiInterview() {
  const vapiRef =
    useRef<Vapi | null>(null);
  const transcriptRef =
    useRef("");
  const messagesRef =
    useRef<TranscriptMessage[]>(
      []
    );
  const callStartRef =
    useRef<number | null>(null);

  const durationIntervalRef =
    useRef<ReturnType<
      typeof setInterval
    > | null>(null);
  const stepIntervalRef =
    useRef<ReturnType<
      typeof setInterval
    > | null>(null);

  const mountedRef =
    useRef(true);
  const phaseRef =
    useRef<InterviewPhase>("idle");
  const hasEvaluatedRef =
    useRef(false);
  const startInFlightRef =
    useRef(false);
  const endInFlightRef =
    useRef(false);

  const [phase, setPhase] =
    useState<InterviewPhase>(
      "idle"
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
  ] =
    useState<ParsedEvaluation | null>(
      null
    );
  const [error, setError] =
    useState<string | null>(
      null
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

      if (
        stepIntervalRef.current
      ) {
        clearInterval(
          stepIntervalRef.current
        );
        stepIntervalRef.current =
          null;
      }
    }, []);

  const resetSession =
    useCallback(() => {
      transcriptRef.current = "";
      messagesRef.current = [];
      callStartRef.current = null;

      hasEvaluatedRef.current =
        false;
      startInFlightRef.current =
        false;
      endInFlightRef.current =
        false;

      setMessages([]);
      setEvaluation("");
      setParsedEvaluation(null);
      setError(null);
      setDurationSeconds(0);
      setAnalyzingStep(0);
      setStats(null);
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
          if (
            !callStartRef.current
          ) {
            return;
          }

          setDurationSeconds(
            Math.floor(
              (Date.now() -
                callStartRef.current) /
                1000
            )
          );
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

  const fetchEvaluation =
    useCallback(
      async (
        rawTranscript: string
      ) => {
        const transcript =
          rawTranscript.trim();

        if (!transcript) {
          setPhaseSafe("error");
          setError(
            "No interview transcript was captured."
          );
          setEvaluation(
            "No transcript found after processing."
          );
          endInFlightRef.current =
            false;
          clearTimers();
          return;
        }

        try {
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
                body: JSON.stringify({
                  transcript,
                }),
                timeoutMs:
                  EVALUATE_TIMEOUT_MS,
              }
            );

          if (
            !mountedRef.current
          ) {
            return;
          }

          if (
            !response.ok ||
            data.ok === false
          ) {
            setPhaseSafe("error");
            setError(
              data.error ??
                "Evaluation failed."
            );
            setEvaluation(
              data.evaluation ??
                data.error ??
                "Failed to generate evaluation."
            );
            return;
          }

          setEvaluation(
            data.evaluation ?? ""
          );
          if (data.parsed) {
            setParsedEvaluation(
              data.parsed
            );
          }
          setPhaseSafe("complete");
        } catch (err) {
          if (
            !mountedRef.current
          ) {
            return;
          }

          setPhaseSafe("error");

          if (
            err instanceof
            FetchTimeoutError
          ) {
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
          endInFlightRef.current =
            false;
          clearTimers();
        }
      },
      [clearTimers, setPhaseSafe]
    );

  useEffect(() => {
    mountedRef.current = true;

    const publicKey =
      process.env
        .NEXT_PUBLIC_VAPI_PUBLIC_KEY;

    if (!publicKey) {
      setError(
        "VAPI public key is not configured."
      );
      setPhaseSafe("error");
      return;
    }

    const vapiInstance =
      new Vapi(publicKey);
    vapiRef.current =
      vapiInstance;

    const handleCallStart = () => {
      startInFlightRef.current =
        false;
      endInFlightRef.current =
        false;
      hasEvaluatedRef.current =
        false;

      resetSession();
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
        phaseRef.current !== "active"
      ) {
        return;
      }
      if (endInFlightRef.current) {
        return;
      }

      const text = String(
        message.transcript ??
          message.text ??
          ""
      ).trim();

      if (
        !text ||
        text.length <
          MIN_TRANSCRIPT_CHUNK_LENGTH
      ) {
        return;
      }

      const role = String(
        message.role ??
          "Speaker"
      );

      const previousTranscript =
        transcriptRef.current;
      const previousLineCount =
        previousTranscript
          .split("\n")
          .filter(Boolean).length;

      const merged =
        mergeTranscriptLine(
          previousTranscript,
          text
        );
      const nextLineCount =
        merged
          .split("\n")
          .filter(Boolean).length;

      const isPartialUpdate =
        nextLineCount ===
          previousLineCount &&
        previousLineCount > 0;

      transcriptRef.current = merged;

      setMessages(
        (prevMessages) => {
          let nextMessages: TranscriptMessage[];

          if (
            isPartialUpdate &&
            prevMessages.length > 0
          ) {
            nextMessages = [
              ...prevMessages,
            ];
            nextMessages[
              nextMessages.length - 1
            ] = {
              ...nextMessages[
                nextMessages.length - 1
              ],
              transcript: text,
            };
          } else {
            nextMessages = [
              ...prevMessages,
              {
                id: createMessageId(),
                role,
                transcript: text,
                timestamp:
                  Date.now(),
              },
            ];
          }

          messagesRef.current =
            nextMessages;
          return nextMessages;
        }
      );
    };

    const handleCallEnd = () => {
      startInFlightRef.current =
        false;
      if (endInFlightRef.current) {
        return;
      }
      if (
        phaseRef.current === "active"
      ) {
        clearTimers();
        setPhaseSafe("idle");
      }
    };

    vapiInstance.on(
      "call-start",
      handleCallStart
    );
    vapiInstance.on(
      "message",
      handleMessage
    );
    vapiInstance.on(
      "call-end",
      handleCallEnd
    );

    return () => {
      mountedRef.current = false;
      clearTimers();

      try {
        const startListener =
          handleCallStart as unknown as (
            ...args: unknown[]
          ) => void;
        const messageListener =
          handleMessage as unknown as (
            ...args: unknown[]
          ) => void;
        const endListener =
          handleCallEnd as unknown as (
            ...args: unknown[]
          ) => void;

        const candidate =
          vapiInstance as unknown as {
            off?: (
              event: string,
              listener: (...args: unknown[]) => void
            ) => void;
            removeListener?: (
              event: string,
              listener: (...args: unknown[]) => void
            ) => void;
          };

        candidate.off?.(
          "call-start",
          startListener
        );
        candidate.off?.(
          "message",
          messageListener
        );
        candidate.off?.(
          "call-end",
          endListener
        );

        candidate.removeListener?.(
          "call-start",
          startListener
        );
        candidate.removeListener?.(
          "message",
          messageListener
        );
        candidate.removeListener?.(
          "call-end",
          endListener
        );
      } catch {}

      scheduleIdleTask(() => {
        try {
          const result =
            vapiInstance.stop();
          if (
            result &&
            typeof (
              result as Promise<unknown>
            ).catch === "function"
          ) {
            void (
              result as Promise<unknown>
            ).catch((err) => {
              if (
                !isHarmlessTeardownError(
                  err
                )
              ) {
                console.warn(
                  "VAPI cleanup stop error:",
                  err
                );
              }
            });
          }
        } catch (err) {
          if (
            !isHarmlessTeardownError(
              err
            )
          ) {
            console.warn(
              "VAPI cleanup sync stop error:",
              err
            );
          }
        }
      });

      vapiRef.current =
        null;
    };
  }, [
    clearTimers,
    resetSession,
    setPhaseSafe,
    startDurationTimer,
  ]);

  const startCall =
    useCallback(async () => {
      if (!vapiRef.current) {
        return;
      }
      if (
        startInFlightRef.current
      ) {
        return;
      }

      const current =
        phaseRef.current;
      if (
        current === "connecting" ||
        current === "active" ||
        current === "processing"
      ) {
        return;
      }

      startInFlightRef.current =
        true;
      setError(null);
      setPhaseSafe("connecting");

      try {
        await vapiRef.current.start(
          VAPI_ASSISTANT_ID
        );
      } catch (err) {
        startInFlightRef.current =
          false;
        setPhaseSafe("error");
        setError(
          "Could not start the interview call."
        );
        console.error(err);
      }
    }, [setPhaseSafe]);

  const endCall = useCallback(() => {
    if (!vapiRef.current) {
      return;
    }
    if (endInFlightRef.current) {
      return;
    }
    if (
      phaseRef.current !== "active"
    ) {
      return;
    }
    if (hasEvaluatedRef.current) {
      return;
    }

    endInFlightRef.current = true;
    hasEvaluatedRef.current = true;

    clearTimers();

    const finalDuration =
      callStartRef.current
        ? Math.floor(
            (Date.now() -
              callStartRef.current) /
              1000
          )
        : durationSeconds;

    const transcriptSnapshot =
      transcriptRef.current;
    const statsSnapshot =
      computeTranscriptStats(
        messagesRef.current,
        finalDuration
      );

    setDurationSeconds(
      finalDuration
    );
    setStats(statsSnapshot);
    setPhaseSafe("processing");
    runAnalyzingSteps();

    void fetchEvaluation(
      transcriptSnapshot
    );

    const instance = vapiRef.current;
    scheduleIdleTask(() => {
      try {
        const result =
          instance.stop();
        if (
          result &&
          typeof (
            result as Promise<unknown>
          ).catch === "function"
        ) {
          void (
            result as Promise<unknown>
          ).catch((err) => {
            if (
              !isHarmlessTeardownError(
                err
              )
            ) {
              console.warn(
                "VAPI async stop error:",
                err
              );
            }
          });
        }
      } catch (err) {
        if (
          !isHarmlessTeardownError(
            err
          )
        ) {
          console.warn(
            "VAPI stop error:",
            err
          );
        }
      }
    });
  }, [
    clearTimers,
    durationSeconds,
    fetchEvaluation,
    runAnalyzingSteps,
    setPhaseSafe,
  ]);

  const retryEvaluation =
    useCallback(async () => {
      if (
        !transcriptRef.current.trim()
      ) {
        setError(
          "No transcript available to re-evaluate."
        );
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
        transcriptRef.current
      );
    }, [
      clearTimers,
      fetchEvaluation,
      runAnalyzingSteps,
      setPhaseSafe,
    ]);

  const isCallActive =
    phase === "active" ||
    phase === "connecting";

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
    isCallActive,
    startCall,
    endCall,
    retryEvaluation,
  };
}