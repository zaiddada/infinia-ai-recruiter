"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

import {
  ANALYZING_STEPS,
  EVALUATE_TIMEOUT_MS,
  MIN_TRANSCRIPT_CHUNK_LENGTH,
  VAPI_ASSISTANT_ID,
} from "@/app/lib/constants";
import { fetchWithTimeout, FetchTimeoutError } from "@/app/lib/fetchWithTimeout";
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
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useVapiInterview() {
  const vapiRef = useRef<Vapi | null>(null);
  const transcriptRef = useRef("");
  const messagesRef = useRef<TranscriptMessage[]>([]);
  const callStartRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const [phase, setPhase] = useState<InterviewPhase>("idle");
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [evaluation, setEvaluation] = useState("");
  const [parsedEvaluation, setParsedEvaluation] =
    useState<ParsedEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [analyzingStep, setAnalyzingStep] = useState(0);
  const [stats, setStats] = useState<TranscriptStats | null>(null);

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

  const resetSession = useCallback(() => {
    transcriptRef.current = "";
    callStartRef.current = null;
    setMessages([]);
    messagesRef.current = [];
    setEvaluation("");
    setParsedEvaluation(null);
    setError(null);
    setDurationSeconds(0);
    setAnalyzingStep(0);
    setStats(null);
  }, []);

  const startDurationTimer = useCallback(() => {
    callStartRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      if (callStartRef.current) {
        setDurationSeconds(
          Math.floor((Date.now() - callStartRef.current) / 1000)
        );
      }
    }, 1000);
  }, []);

  const runAnalyzingSteps = useCallback(() => {
    setAnalyzingStep(0);
    stepIntervalRef.current = setInterval(() => {
      setAnalyzingStep((prev) =>
        prev < ANALYZING_STEPS.length - 1 ? prev + 1 : prev
      );
    }, 1400);
  }, []);

  const fetchEvaluation = useCallback(
    async (rawTranscript: string) => {
      const raw = rawTranscript.trim();

      if (!raw) {
        clearTimers();
        setPhase("error");
        setError("No interview transcript was captured.");
        setEvaluation("No transcript found after processing.");
        return;
      }

      try {
        const { response, data } = await fetchWithTimeout<EvaluateResponse>(
          "/api/evaluate",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript: raw }),
            timeoutMs: EVALUATE_TIMEOUT_MS,
          }
        );

        if (!mountedRef.current) return;

        if (!response.ok || data.ok === false) {
          setPhase("error");
          setError(data.error ?? "Evaluation failed.");
          setEvaluation(
            data.evaluation ?? data.error ?? "Failed to generate evaluation."
          );
          return;
        }

        setEvaluation(data.evaluation ?? "");
        if (data.parsed) {
          setParsedEvaluation(data.parsed);
        }
        setPhase("complete");
      } catch (err) {
        if (!mountedRef.current) return;
        setPhase("error");
        if (err instanceof FetchTimeoutError) {
          setError("Evaluation timed out. Please try again.");
          setEvaluation(
            "The AI recruiter took too long to respond. Please retry."
          );
        } else {
          setError("Network error while generating evaluation.");
          setEvaluation("Failed to generate evaluation. Check your connection.");
        }
      } finally {
        clearTimers();
      }
    },
    [clearTimers]
  );

  useEffect(() => {
    mountedRef.current = true;
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;

    if (!publicKey) {
      setError("VAPI public key is not configured.");
      setPhase("error");
      return;
    }

    const vapiInstance = new Vapi(publicKey);
    vapiRef.current = vapiInstance;

    vapiInstance.on("call-start", () => {
      resetSession();
      setPhase("active");
      startDurationTimer();
    });

    vapiInstance.on("message", (message: Record<string, unknown>) => {
      if (message.type !== "transcript") return;

      const text = String(
        message.transcript ?? message.text ?? ""
      ).trim();

      if (!text || text.length < MIN_TRANSCRIPT_CHUNK_LENGTH) return;

      const role = String(message.role ?? "Speaker");
      const prevTranscript = transcriptRef.current;
      const linesBefore = prevTranscript
        .split("\n")
        .filter(Boolean).length;
      const merged = mergeTranscriptLine(prevTranscript, text);
      const linesAfter = merged.split("\n").filter(Boolean).length;
      const isPartialUpdate =
        linesAfter === linesBefore && linesBefore > 0;

      transcriptRef.current = merged;

      setMessages((prevMessages) => {
        let next: TranscriptMessage[];

        if (isPartialUpdate && prevMessages.length > 0) {
          next = [...prevMessages];
          next[next.length - 1] = {
            ...next[next.length - 1],
            transcript: text,
          };
        } else {
          next = [
            ...prevMessages,
            {
              id: createMessageId(),
              role,
              transcript: text,
              timestamp: Date.now(),
            },
          ];
        }

        messagesRef.current = next;
        return next;
      });
    });

    vapiInstance.on("call-end", async () => {
      clearTimers();
      const finalDuration = callStartRef.current
        ? Math.floor((Date.now() - callStartRef.current) / 1000)
        : durationSeconds;

      setDurationSeconds(finalDuration);
      setStats(
        computeTranscriptStats(
          messagesRef.current,
          finalDuration
        )
      );

      setPhase("processing");
      runAnalyzingSteps();

      await fetchEvaluation(transcriptRef.current);
    });

    return () => {
      mountedRef.current = false;
      clearTimers();
      vapiInstance.stop();
      vapiRef.current = null;
    };
  }, [
    clearTimers,
    fetchEvaluation,
    resetSession,
    runAnalyzingSteps,
    startDurationTimer,
  ]);

  const startCall = useCallback(async () => {
    if (!vapiRef.current) return;
    setError(null);
    setPhase("connecting");
    try {
      await vapiRef.current.start(VAPI_ASSISTANT_ID);
    } catch (err) {
      console.error(err);
      setPhase("error");
      setError("Could not start the interview call.");
    }
  }, []);

  const endCall = useCallback(() => {
    vapiRef.current?.stop();
  }, []);

  const retryEvaluation = useCallback(async () => {
    if (!transcriptRef.current.trim()) {
      setError("No transcript available to re-evaluate.");
      return;
    }
    clearTimers();
    setError(null);
    setEvaluation("");
    setParsedEvaluation(null);
    setPhase("processing");
    runAnalyzingSteps();
    await fetchEvaluation(transcriptRef.current);
  }, [clearTimers, fetchEvaluation, runAnalyzingSteps]);

  const isCallActive = phase === "active" || phase === "connecting";

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
    startCall,
    endCall,
    retryEvaluation,
  };
}
