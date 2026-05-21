import { notFound } from "next/navigation";

import { supabaseServer } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CandidatePage({
  params,
}: Props) {

  const { id } =
    await params;

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
    data.evaluation ?? {};

  return (
    <main className="min-h-screen bg-black text-white">

      <div className="mx-auto max-w-5xl p-8">

        {/* HEADER */}

        <div className="mb-10 flex items-start justify-between">

          <div>

            <p className="text-sm uppercase tracking-[0.3em] text-emerald-500">
              Candidate Intelligence Report
            </p>

            <h1 className="mt-3 text-5xl font-semibold">
              {data.candidate_name ??
                "Unknown Candidate"}
            </h1>

            <p className="mt-4 text-zinc-400">
              AI recruiter evaluation generated from live voice interview analysis.
            </p>

          </div>

          <div className="text-right">

            <p className="text-sm text-zinc-500">
              Overall Score
            </p>

            <p className="mt-2 text-6xl font-bold text-emerald-400">
              {data.score ?? 0}
            </p>

          </div>

        </div>

        {/* GRID */}

        <div className="grid gap-6 md:grid-cols-2">

          {/* SUMMARY */}

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">

            <h2 className="text-xl font-semibold">
              Recruiter Summary
            </h2>

            <p className="mt-4 leading-8 text-zinc-300">
              {evaluation.recruiterSummary ??
                "No recruiter summary available."}
            </p>

          </div>

          {/* OVERVIEW */}

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">

            <h2 className="text-xl font-semibold">
              Candidate Overview
            </h2>

            <p className="mt-4 leading-8 text-zinc-300">
              {evaluation.overview ??
                "No overview available."}
            </p>

          </div>

          {/* STRENGTHS */}

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">

            <h2 className="text-xl font-semibold text-emerald-400">
              Strengths
            </h2>

            <div className="mt-5 space-y-3">

              {(
                evaluation.strengths ??
                []
              ).map(
                (
                  item: string,
                  index: number
                ) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4 text-zinc-300"
                  >
                    {item}
                  </div>
                )
              )}

            </div>

          </div>

          {/* WEAKNESSES */}

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">

            <h2 className="text-xl font-semibold text-red-400">
              Weaknesses
            </h2>

            <div className="mt-5 space-y-3">

              {(
                evaluation.weaknesses ??
                []
              ).map(
                (
                  item: string,
                  index: number
                ) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-red-500/10 bg-red-500/5 p-4 text-zinc-300"
                  >
                    {item}
                  </div>
                )
              )}

            </div>

          </div>

        </div>

        {/* TRANSCRIPT */}

        <div className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">

          <h2 className="text-xl font-semibold">
            Transcript
          </h2>

          <div className="mt-5 max-h-[500px] overflow-y-auto rounded-2xl bg-black/40 p-5 text-sm leading-8 text-zinc-300 whitespace-pre-wrap">
            {data.transcript}
          </div>

        </div>

      </div>

    </main>
  );
}