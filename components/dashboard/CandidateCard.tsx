"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";

type CandidateCardProps = {
  candidate: {
    id: string;

    candidate_name?: string;

    recommendation?: string;

    score?: number;

    confidence?: string;

    created_at?: string;

    low_signal?: boolean;

    evaluation?: {
      recruiterSummary?: string;
    };
  };
};

function getRecommendationStyles(
  recommendation?: string
) {
  switch (recommendation) {
    case "Strong Hire":
      return "bg-green-500/15 text-green-400 border-green-500/20";

    case "Hire":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";

    case "Maybe":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/20";

    case "Weak Maybe":
      return "bg-orange-500/15 text-orange-400 border-orange-500/20";

    case "Reject":
      return "bg-red-500/15 text-red-400 border-red-500/20";

    case "Hold / Human Review":
      return "bg-zinc-500/15 text-zinc-300 border-zinc-500/20";

    default:
      return "bg-zinc-500/10 text-zinc-300 border-zinc-500/20";
  }
}

function getScoreColor(score?: number) {
  if (!score) {
    return "text-zinc-400";
  }

  if (score >= 85) {
    return "text-green-400";
  }

  if (score >= 70) {
    return "text-emerald-400";
  }

  if (score >= 55) {
    return "text-yellow-400";
  }

  if (score >= 40) {
    return "text-orange-400";
  }

  return "text-red-400";
}

export function CandidateCard({
  candidate,
}: CandidateCardProps) {
  const router = useRouter();

  const score = candidate.score ?? 0;

  const recruiterSummary =
    candidate.evaluation?.recruiterSummary ??
    "AI recruiter evaluation completed.";

  return (
    <Link
      href={`/dashboard/${candidate.id}`}
      className="block"
    >
      <div className="group rounded-3xl border border-white/10 bg-zinc-900/80 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:bg-zinc-900">
        {/* TOP */}

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xl font-semibold text-white">
                {candidate.candidate_name ||
                  "Unknown Candidate"}
              </h2>

              {candidate.low_signal && (
                <div className="rounded-full bg-orange-500/15 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-orange-400">
                  Low Signal
                </div>
              )}
            </div>

            <p className="mt-2 text-sm text-zinc-500">
              AI Recruiter Evaluation
            </p>
          </div>

          {/* SCORE */}

          <div className="text-right">
            <p
              className={`text-5xl font-bold tracking-tight ${getScoreColor(
                score
              )}`}
            >
              {score}
            </p>

            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
              Overall Score
            </p>
          </div>
        </div>

        {/* SUMMARY */}

        <div className="mt-6">
          <p className="line-clamp-3 text-sm leading-6 text-zinc-300">
            {recruiterSummary}
          </p>
        </div>

        {/* BADGES */}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Badge
            className={`border ${getRecommendationStyles(
              candidate.recommendation
            )}`}
          >
            {candidate.recommendation ??
              "Pending"}
          </Badge>

          <Badge
            variant="outline"
            className="border-white/10 bg-black/20 text-zinc-300"
          >
            {candidate.confidence ??
              "unknown"}{" "}
            confidence
          </Badge>
        </div>

        {/* FOOTER */}

        <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
          <p className="text-xs text-zinc-500">
          {
  candidate.created_at
    ? new Date(
        candidate.created_at
      ).toISOString()
      .replace("T", " ")
      .slice(0, 19)
    : "No date available"
}
          </p>

          <button
            onClick={(e) => {
              e.preventDefault();

              router.push(
                `/dashboard/candidate/${candidate.id}`
              );
            }}
            className="text-sm font-medium text-emerald-400 opacity-0 transition-all duration-300 hover:text-emerald-300 group-hover:opacity-100"
          >
            View Report →
          </button>
        </div>
      </div>
    </Link>
  );
}
