"use client";

import { Loader2, Sparkles } from "lucide-react";

import type { TranscriptStats } from "@/app/types/interview";

export function ProcessingPanel({
  stepIndex,
  steps,
  stats,
}: {
  stepIndex: number;
  steps: readonly string[];
  stats: TranscriptStats | null;
}) {
  const progress = Math.round(
    ((stepIndex + 1) / steps.length) * 100
  );

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 animate-pulse rounded-full bg-emerald-500/20 blur-2xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
          <Sparkles className="h-9 w-9 text-emerald-400" />
          <Loader2 className="absolute -right-1 -bottom-1 h-6 w-6 animate-spin text-emerald-300/80" />
        </div>
      </div>

      <h3 className="text-xl font-semibold tracking-tight text-white">
        AI recruiter is analyzing
      </h3>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        We are cleaning the transcript, removing duplicates, and generating a
        fair, recruiter-grade evaluation.
      </p>

      {stats && (
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-zinc-500">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {stats.wordCount} words
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {stats.lineCount} turns
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Candidate ~{stats.candidateWordShare}% of words
          </span>
        </div>
      )}

      <div className="mt-10 w-full max-w-md">
        <div className="mb-2 flex justify-between text-xs text-zinc-500">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <ul className="mt-8 w-full max-w-md space-y-2 text-left text-sm">
        {steps.map((step, i) => (
          <li
            key={step}
            className={`flex items-start gap-3 rounded-lg px-3 py-2 transition ${
              i === stepIndex
                ? "bg-emerald-500/10 text-emerald-100"
                : i < stepIndex
                  ? "text-zinc-500 line-through decoration-zinc-600"
                  : "text-zinc-600"
            }`}
          >
            <span
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                i < stepIndex
                  ? "bg-emerald-500"
                  : i === stepIndex
                    ? "animate-pulse bg-emerald-400"
                    : "bg-zinc-700"
              }`}
            />
            {step}
          </li>
        ))}
      </ul>
    </div>
  );
}
