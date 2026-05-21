import { notFound } from "next/navigation";

import { supabaseServer } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CandidateDetailPage({
  params,
}: Props) {
  const { id } = await params;

  const { data } =
    await supabaseServer
      .from("candidate_reports")
      .select("*")
      .eq("id", id)
      .single();

  if (!data) {
    notFound();
  }

  const evaluation =
    data.evaluation || {};

  return (
    <main className="min-h-screen bg-black text-white">

      <div className="mx-auto max-w-5xl p-8">

        {/* HEADER */}

        <div className="mb-10 flex items-start justify-between">

          <div>

            <p className="text-sm uppercase tracking-[0.3em] text-emerald-500">
              Candidate Intelligence
            </p>

            <h1 className="mt-3 text-5xl font-semibold">
              {data.candidate_name ||
                "Unknown Candidate"}
            </h1>

            <p className="mt-4 max-w-2xl text-zinc-400">
              AI recruiter evaluation and interview intelligence report.
            </p>

          </div>

          <div className="text-right">

            <p className="text-6xl font-bold text-emerald-400">
              {data.score ?? 0}
            </p>

            <p className="mt-2 text-zinc-500">
              Overall Score
            </p>

          </div>

        </div>

        {/* TOP GRID */}

        <div className="grid gap-5 md:grid-cols-3">

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">

            <p className="text-sm text-zinc-500">
              Recommendation
            </p>

            <h2 className="mt-3 text-2xl font-semibold">
              {data.recommendation}
            </h2>

          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">

            <p className="text-sm text-zinc-500">
              Confidence
            </p>

            <h2 className="mt-3 text-2xl font-semibold capitalize">
              {data.confidence}
            </h2>

          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">

            <p className="text-sm text-zinc-500">
              Low Signal
            </p>

            <h2 className="mt-3 text-2xl font-semibold">
              {data.low_signal
                ? "Yes"
                : "No"}
            </h2>

          </div>

        </div>

        {/* SUMMARY */}

        <div className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-8">

          <h2 className="text-2xl font-semibold">
            Recruiter Summary
          </h2>

          <p className="mt-5 leading-8 text-zinc-300">
            {evaluation.recruiterSummary ||
              "No summary available."}
          </p>

        </div>

        {/* STRENGTHS + WEAKNESSES */}

        <div className="mt-8 grid gap-5 md:grid-cols-2">

          <div className="rounded-3xl border border-emerald-500/20 bg-zinc-900 p-8">

            <h2 className="text-2xl font-semibold text-emerald-400">
              Strengths
            </h2>

            <ul className="mt-5 space-y-3">

              {(evaluation.strengths || []).map(
                (
                  item: string,
                  index: number
                ) => (
                  <li
                    key={index}
                    className="text-zinc-300"
                  >
                    • {item}
                  </li>
                )
              )}

            </ul>

          </div>

          <div className="rounded-3xl border border-red-500/20 bg-zinc-900 p-8">

            <h2 className="text-2xl font-semibold text-red-400">
              Weaknesses
            </h2>

            <ul className="mt-5 space-y-3">

              {(evaluation.weaknesses || []).map(
                (
                  item: string,
                  index: number
                ) => (
                  <li
                    key={index}
                    className="text-zinc-300"
                  >
                    • {item}
                  </li>
                )
              )}

            </ul>

          </div>

        </div>

        {/* TRANSCRIPT */}

        <div className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-8">

          <h2 className="text-2xl font-semibold">
            Interview Transcript
          </h2>

          <pre className="mt-6 whitespace-pre-wrap text-sm leading-7 text-zinc-400">
            {data.transcript}
          </pre>

        </div>

      </div>

    </main>
  );
}