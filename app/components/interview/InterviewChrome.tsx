"use client";

import {
  LayoutDashboard,
  Phone,
  PhoneOff,
  Sparkles,
} from "lucide-react";

import { formatDuration } from "@/app/lib/evaluationParser";
import type { InterviewPhase } from "@/app/types/interview";

import { GlassCard } from "./GlassCard";

export function InterviewHeader({
  phase,
  durationSeconds,
}: {
  phase: InterviewPhase;
  durationSeconds: number;
}) {
  const status =
    phase === "idle"
      ? "Ready"
      : phase === "connecting"
        ? "Connecting…"
        : phase === "active"
          ? "Interview live"
          : phase === "processing"
            ? "Analyzing"
            : phase === "complete"
              ? "Complete"
              : "Attention";

  return (
    <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 backdrop-blur">
          <LayoutDashboard className="h-3.5 w-3.5 text-emerald-400" />
          Infinia Voice Recruiter
          <span className="mx-1 text-zinc-600">·</span>
          <span className="text-zinc-400">{status}</span>
        </div>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Screen candidates with{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            voice AI
          </span>{" "}
          that thinks like a recruiter.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-400">
          Live conversation, fair post-call analysis, and export-ready
          evaluations — built for hiring teams who care about signal quality.
        </p>
      </div>

      <GlassCard className="shrink-0 px-5 py-4">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">
              Session timer
            </p>
            <p className="mt-1 font-mono text-2xl font-medium tabular-nums text-white">
              {formatDuration(durationSeconds)}
            </p>
          </div>
          <div className="h-10 w-px bg-white/10" />
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Sparkles className="h-4 w-4 text-violet-400" />
            Gemini-powered analysis
          </div>
        </div>
      </GlassCard>
    </header>
  );
}

export function CallControls({
  phase,
  onStart,
  onEnd,
}: {
  phase: InterviewPhase;
  onStart: () => void;
  onEnd: () => void;
}) {
  const busy = phase === "connecting" || phase === "processing";
  const live = phase === "active";

  return (
    <div className="flex flex-col items-center">
      <div
        className={[
          "relative mb-8 flex h-44 w-44 items-center justify-center rounded-full border transition-all duration-500",
          live
            ? "border-red-500/40 bg-red-500/[0.08] shadow-[0_0_80px_-20px_rgba(239,68,68,0.45)]"
            : "border-emerald-500/35 bg-emerald-500/[0.06] shadow-[0_0_60px_-24px_rgba(16,185,129,0.35)]",
        ].join(" ")}
      >
        {live && (
          <span className="absolute inset-0 animate-ping rounded-full border border-red-500/20 opacity-30" />
        )}
        <div
          className={[
            "flex h-28 w-28 items-center justify-center rounded-full border bg-black/40 backdrop-blur-sm",
            live ? "border-red-500/30" : "border-emerald-500/25",
          ].join(" ")}
        >
          {live ? (
            <PhoneOff className="h-12 w-12 text-red-400" strokeWidth={1.5} />
          ) : (
            <Phone className="h-12 w-12 text-emerald-400" strokeWidth={1.5} />
          )}
        </div>
      </div>

      {!live ? (
        <button
          type="button"
          disabled={busy}
          onClick={onStart}
          className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-10 py-4 text-base font-semibold text-black shadow-lg shadow-emerald-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Phone className="h-5 w-5" />
          {phase === "connecting" ? "Connecting…" : "Start interview"}
        </button>
      ) : (
        <button
          type="button"
          onClick={onEnd}
          className="inline-flex items-center gap-3 rounded-full border border-red-500/40 bg-red-500/15 px-10 py-4 text-base font-semibold text-red-100 transition hover:bg-red-500/25"
        >
          <PhoneOff className="h-5 w-5" />
          End & analyze
        </button>
      )}

      {busy && (
        <p className="mt-4 text-center text-xs text-zinc-500">
          {phase === "connecting"
            ? "Establishing secure voice session…"
            : "Please keep this tab open while we generate your report."}
        </p>
      )}
    </div>
  );
}
