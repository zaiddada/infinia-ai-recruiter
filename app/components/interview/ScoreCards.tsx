import type { EvaluationScores } from "@/app/types/interview";

const SCORE_ITEMS: {
  key: keyof EvaluationScores;
  label: string;
  hint: string;
}[] = [
  { key: "communication", label: "Communication", hint: "Clarity & structure" },
  { key: "technical", label: "Technical", hint: "Depth of answers" },
  { key: "confidence", label: "Confidence", hint: "Composure" },
  { key: "growthPotential", label: "Growth", hint: "Learning agility" },
  { key: "cultureFit", label: "Culture", hint: "Collaboration" },
  { key: "overall", label: "Overall", hint: "Holistic" },
];

export function ScoreCards({ scores }: { scores: EvaluationScores }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {SCORE_ITEMS.map(({ key, label, hint }) => {
        const value = scores[key];
        const display =
          value !== undefined ? `${value}/100` : "—";
        return (
          <div
            key={key}
            className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-3 transition hover:border-emerald-500/30"
          >
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">
              {label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
              {display}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">{hint}</p>
          </div>
        );
      })}
    </div>
  );
}
