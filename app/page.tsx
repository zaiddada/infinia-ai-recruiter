"use client";

import { EvaluationSection } from "@/app/components/interview/EvaluationSection";
import {
  CallControls,
  InterviewHeader,
} from "@/app/components/interview/InterviewChrome";
import { GlassCard } from "@/app/components/interview/GlassCard";
import { ProcessingPanel } from "@/app/components/interview/ProcessingPanel";
import { TranscriptPanel } from "@/app/components/interview/TranscriptPanel";
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

  const showEvaluation =
    evaluation.length > 0 || phase === "error";

  const transcriptLive =
    isCallActive || phase === "processing";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050506] text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% -30%, rgba(16,185,129,0.12), transparent), radial-gradient(ellipse 80% 50% at 100% 0%, rgba(139,92,246,0.08), transparent)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2240%22%20height%3D%2240%22%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22rgba(255,255,255,0.03)%22%20stroke-width%3D%221%22%3E%3Cpath%20d%3D%22M0%20h40M40%200%20v40%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-60" />

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <InterviewHeader
          phase={phase}
          durationSeconds={durationSeconds}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <section className="lg:col-span-5">
            <GlassCard className="p-6 sm:p-8">
              <CallControls
                phase={phase}
                onStart={startCall}
                onEnd={endCall}
              />
              <p className="mx-auto mt-10 max-w-sm text-center text-xs leading-relaxed text-zinc-500">
                Voice is powered by VAPI. When you end the call, the transcript
                is cleaned server-side and analyzed by Gemini into structured
                recruiter notes.
              </p>
            </GlassCard>
          </section>

          <section className="lg:col-span-7">
            <GlassCard className="min-h-[420px] p-5 sm:p-6 lg:min-h-[620px]">
              {phase === "processing" ? (
                <ProcessingPanel
                  stepIndex={analyzingStep}
                  steps={analyzingSteps}
                  stats={stats}
                />
              ) : (
                <TranscriptPanel
                  messages={messages}
                  isLive={transcriptLive && phase !== "idle"}
                />
              )}
            </GlassCard>
          </section>
        </div>

        {showEvaluation && (
          <div className="mt-10 opacity-100 transition-opacity duration-500">
            <EvaluationSection
              evaluation={evaluation}
              parsed={parsedEvaluation}
              stats={stats}
              durationSeconds={durationSeconds}
              error={error}
              onRetry={retryEvaluation}
            />
          </div>
        )}
      </main>
    </div>
  );
}
