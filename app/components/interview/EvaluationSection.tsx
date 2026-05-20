"use client";

import { AlertCircle, BrainCircuit } from "lucide-react";

import { formatDuration } from "@/app/lib/evaluationParser";
import { computeInsightConfidence } from "@/app/lib/insightConfidence";
import type { ParsedEvaluation, TranscriptStats } from "@/app/types/interview";

import { ExportSection } from "./ExportSection";
import { GlassCard } from "./GlassCard";
import { InsightBadges } from "./InsightBadges";
import { ScoreCards } from "./ScoreCards";

export function EvaluationSection({
  evaluation,
  parsed,
  stats,
  durationSeconds,
  error,
  onRetry,
}: {
  evaluation: string;
  parsed: ParsedEvaluation | null;
  stats: TranscriptStats | null;
  durationSeconds: number;
  error: string | null;
  onRetry: () => void;
}) {
  const scoresParsed = Boolean(
    parsed &&
      Object.values(parsed.scores).some(
        (v) => v !== undefined
      )
  );

  const confidence = computeInsightConfidence(stats, scoresParsed);
  const systemConfidence = parsed?.confidence ?? confidence.level;
  const systemCoverage = parsed?.evidenceCoverage ?? confidence.percent;

  if (!evaluation && !error) return null;

  return (
    <GlassCard className="p-6 sm:p-8" glow={!error}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
            <BrainCircuit className="h-3.5 w-3.5 text-emerald-400" />
            Post-interview intelligence
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Recruiter evaluation
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Fair, bias-aware assessment · {formatDuration(durationSeconds)}{" "}
            conversation
          </p>
        </div>

        {error && (
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/10"
            >
              Retry evaluation
            </button>
          </div>
        )}
      </div>

      {parsed && <InsightBadges parsed={parsed} />}

      {parsed?.status === "insufficient_data" && (
        <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-500/10 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-200">
            Insufficient interview signal
          </h3>
          <p className="mt-2 text-sm text-amber-50/90">
            {parsed.message || "Interview too short for reliable evaluation."}
          </p>
          {parsed.recommendedAction && (
            <p className="mt-2 text-xs text-amber-100/80">
              Recommended action: {parsed.recommendedAction}
            </p>
          )}
          {parsed.observedFacts && parsed.observedFacts.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-amber-100/85">
              {parsed.observedFacts.map((fact) => (
                <li key={fact}>- {fact}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill label="Words" value={String(stats.wordCount)} />
          <StatPill label="Turns" value={String(stats.lineCount)} />
          <StatPill
            label="Candidate share"
            value={`~${stats.candidateWordShare}%`}
          />
          <StatPill
            label="Duration"
            value={formatDuration(stats.durationSeconds)}
          />
        </div>
      )}

      <div className="mt-6 rounded-xl border border-white/[0.06] bg-black/25 p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Insight confidence
          </span>
          <span
            className={`text-xs font-medium capitalize ${
              confidence.level === "high"
                ? "text-emerald-400"
                : confidence.level === "medium"
                  ? "text-amber-300"
                  : "text-zinc-400"
            }`}
          >
            {systemConfidence}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all duration-700"
            style={{ width: `${systemCoverage}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {parsed?.status === "insufficient_data"
            ? "Low-confidence output. Detailed recruiter scoring is intentionally suppressed."
            : confidence.label}
        </p>
      </div>

      {parsed && parsed.status !== "insufficient_data" && (
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="mb-3 text-sm font-medium text-zinc-400">
              Score cards
            </h3>
            <ScoreCards scores={parsed.scores} />
          </div>

          {parsed.overview && (
            <Block title="Candidate overview" body={parsed.overview} />
          )}

          {parsed.keyObservations.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-400">
                Key observations
              </h3>
              <ul className="space-y-2 text-sm text-zinc-300">
                {parsed.keyObservations.map((o) => (
                  <li
                    key={o}
                    className="flex gap-2 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2"
                  >
                    <span className="text-emerald-500/80">→</span>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {parsed.growthPotential && (
              <Block title="Growth potential" body={parsed.growthPotential} />
            )}
            {parsed.cultureFit && (
              <Block title="Culture fit" body={parsed.cultureFit} />
            )}
          </div>

          {parsed.hiringRecommendation && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">
                Hiring recommendation
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-50/95">
                {parsed.hiringRecommendation}
              </p>
            </div>
          )}

          {parsed.recruiterSummary && (
            <Block title="Recruiter summary" body={parsed.recruiterSummary} />
          )}

          {parsed.coachingSuggestions.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-400">
                Coaching suggestions
              </h3>
              <ul className="space-y-2 text-sm text-zinc-300">
                {parsed.coachingSuggestions.map((c) => (
                  <li key={c} className="rounded-lg bg-violet-500/5 px-3 py-2">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {evaluation && (
        <details className="mt-8 group">
          <summary className="cursor-pointer text-sm font-medium text-zinc-400 transition hover:text-zinc-200">
            Raw evaluation (Markdown)
          </summary>
          <pre className="custom-scrollbar mt-4 max-h-80 overflow-auto rounded-xl border border-white/[0.06] bg-black/50 p-4 text-xs leading-relaxed text-zinc-400">
            {evaluation}
          </pre>
        </details>
      )}

      {evaluation && !error && (
        <div className="mt-6">
          <ExportSection markdown={evaluation} parsed={parsed} />
        </div>
      )}
    </GlassCard>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-zinc-400">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-300">{body}</p>
    </div>
  );
}
