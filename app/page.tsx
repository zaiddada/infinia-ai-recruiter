"use client";

import {
  EvaluationSection,
} from "@/app/components/interview/EvaluationSection";

import {
  CallControls,
  InterviewHeader,
} from "@/app/components/interview/InterviewChrome";

import { GlassCard } from "@/app/components/interview/GlassCard";

import { ProcessingPanel } from "@/app/components/interview/ProcessingPanel";

import { TranscriptPanel } from "@/app/components/interview/TranscriptPanel";

import { downloadTranscript } from "@/app/lib/exportTranscript";
import { useVapiInterview } from "@/app/hooks/useVapiInterview";

export default function Home() {
  const {
    phase,
    messages,
    evaluation,
    parsedEvaluation,
    error,
    durationSeconds,
    analyzingStep,
    analyzingSteps,
    stats,
    isCallActive,
    startCall,
    endCall,
    retryEvaluation,
  } = useVapiInterview();

  // -----------------------------------
  // EVALUATION VISIBILITY
  // -----------------------------------
  const showEvaluation =
    evaluation.length > 0 ||
    phase === "error";

  // -----------------------------------
  // LIVE TRANSCRIPT STATE
  // -----------------------------------
  const transcriptLive =
    isCallActive ||
    phase === "processing";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050506] text-zinc-100">

      {/* BACKGROUND */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% -30%, rgba(16,185,129,0.12), transparent), radial-gradient(ellipse 80% 50% at 100% 0%, rgba(139,92,246,0.08), transparent)",
        }}
      />

      {/* GRID OVERLAY */}
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22%3E%3Cg fill=%22none%22 stroke=%22rgba(255,255,255,0.03)%22 stroke-width=%221%22%3E%3Cpath d=%22M0 h40M40 0 v40%22/%3E%3C/g%3E%3C/svg%3E')] opacity-60" />

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pt-12">

        {/* HEADER */}
        <InterviewHeader
          phase={phase}
          durationSeconds={
            durationSeconds
          }
        />

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">

          {/* LEFT PANEL */}
          <section className="sticky top-6 self-start lg:col-span-5">

            <GlassCard className="p-6 sm:p-8">

              <CallControls
                phase={phase}
                onStart={startCall}
                onEnd={endCall}
              />

              {/* SESSION STATUS */}
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Session Status
                    </p>

                    <p className="mt-2 text-sm text-zinc-300">

                      {phase ===
                        "idle" &&
                        "Waiting to start interview"}

                      {phase ===
                        "connecting" &&
                        "Connecting to voice agent..."}

                      {phase ===
                        "active" &&
                        "Interview is live"}

                      {phase ===
                        "processing" &&
                        "Analyzing transcript with Gemini"}

                      {phase ===
                        "complete" &&
                        "Evaluation completed"}

                      {phase ===
                        "error" &&
                        "Something went wrong"}

                    </p>

                  </div>

                  <div
                    className={`h-3 w-3 rounded-full ${
                      phase ===
                      "active"
                        ? "bg-emerald-400 animate-pulse"
                        : phase ===
                          "processing"
                        ? "bg-violet-400 animate-pulse"
                        : phase ===
                          "error"
                        ? "bg-red-400"
                        : "bg-zinc-600"
                    }`}
                  />

                </div>

              </div>

              {/* AI ANALYZING */}
              {phase ===
                "processing" && (
                <div className="mt-6 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">

                  <div className="flex items-center gap-3">

                    <div className="h-3 w-3 rounded-full bg-violet-400 animate-pulse" />

                    <p className="text-sm font-medium text-violet-200">
                      AI is analyzing the interview...
                    </p>

                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                    Generating recruiter summary,
                    communication analysis,
                    hiring recommendation,
                    coaching suggestions,
                    and candidate insights.
                  </p>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">

                    <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-violet-500 to-emerald-400" />

                  </div>

                </div>
              )}

              {/* FOOTER */}
              <p className="mx-auto mt-8 max-w-sm text-center text-xs leading-relaxed text-zinc-500">
                Voice is powered by
                VAPI. Transcript is
                cleaned server-side and
                evaluated by Gemini into
                structured recruiter
                insights.
              </p>

            </GlassCard>

          </section>

          {/* RIGHT PANEL */}
          <section className="lg:col-span-7">

            <GlassCard className="flex h-[720px] flex-col overflow-hidden p-5 sm:p-6">

              {/* PANEL HEADER */}
              <div className="mb-5 flex items-center justify-between border-b border-white/5 pb-4">

                <div>

                  <h2 className="text-xl font-semibold">
                    Live transcript
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Real-time capture •
                    recruiter-ready
                  </p>

                </div>

                <div className="flex items-center gap-2">
                  {messages.length > 0 && phase !== "processing" && (
                    <button
                      type="button"
                      onClick={() =>
                        downloadTranscript(
                          messages,
                          durationSeconds
                        )
                      }
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
                    >
                      Download transcript
                    </button>
                  )}

                  <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-400">
                    {messages.length} messages
                  </div>
                </div>

              </div>

              {/* Transcript body — single scroll owner via min-h-0 flex chain */}
              <div className="min-h-0 flex-1 overflow-hidden">

                {phase === "processing" ? (
                  <div className="custom-scrollbar h-full overflow-y-auto pr-2">
                    <ProcessingPanel
                      stepIndex={analyzingStep}
                      steps={analyzingSteps}
                      stats={stats}
                    />
                  </div>
                ) : (
                  <TranscriptPanel
                    messages={messages}
                    isLive={
                      transcriptLive && phase !== "idle"
                    }
                    durationSeconds={durationSeconds}
                    showHeader={false}
                  />
                )}

              </div>

            </GlassCard>

          </section>

        </div>

        {/* EVALUATION */}
        {showEvaluation && (
          <div className="mt-10 animate-in fade-in duration-500">

            <EvaluationSection
              evaluation={
                evaluation
              }
              parsed={
                parsedEvaluation
              }
              stats={stats}
              durationSeconds={
                durationSeconds
              }
              error={error}
              onRetry={
                retryEvaluation
              }
            />

          </div>
        )}

      </main>

    </div>
  );
}