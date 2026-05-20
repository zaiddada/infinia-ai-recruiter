import type { ParsedEvaluation } from "@/app/types/interview";

export function InsightBadges({
  parsed,
}: {
  parsed: ParsedEvaluation | null;
}) {
  if (parsed?.status === "insufficient_data") {
    return (
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
          Insufficient data
        </span>
        <span className="rounded-full border border-zinc-500/25 bg-zinc-500/10 px-3 py-1 text-xs font-medium text-zinc-300">
          Confidence: low
        </span>
      </div>
    );
  }

  const rec = parsed?.hiringRecommendation ?? "";
  const tone =
    /strong yes/i.test(rec)
      ? "Strong hire signal"
      : /lean yes|yes/i.test(rec)
        ? "Positive signal"
        : /hold/i.test(rec)
          ? "Needs follow-up"
          : /no/i.test(rec)
            ? "Not a fit (this round)"
            : "Recommendation pending";

  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
        Fairness-calibrated
      </span>
      <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
        Voice-to-text aware
      </span>
      <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200">
        {tone}
      </span>
    </div>
  );
}
