import { CandidateCard } from "@/components/dashboard/CandidateCard";
import { supabaseServer } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const { data, error } =
    await supabaseServer
      .from("candidate_reports")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white p-8">
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-2xl font-semibold text-red-400">
            Failed to load recruiter dashboard
          </h1>

          <p className="mt-3 text-zinc-400">
            {error.message}
          </p>
        </div>
      </main>
    );
  }

  const candidates = data ?? [];

  const totalCandidates =
    candidates.length;

  const hireCount =
    candidates.filter(
      (c) =>
        c.recommendation ===
          "Hire" ||
        c.recommendation ===
          "Strong Hire"
    ).length;

  const rejectCount =
    candidates.filter(
      (c) =>
        c.recommendation ===
        "Reject"
    ).length;

  const reviewCount =
    candidates.filter(
      (c) =>
        c.recommendation ===
          "Hold / Human Review" ||
        c.recommendation ===
          "Maybe" ||
        c.recommendation ===
          "Weak Maybe"
    ).length;

  const lowSignalCount =
    candidates.filter(
      (c) => c.low_signal
    ).length;

  const averageScore =
    Math.round(
      candidates.reduce(
        (acc, c) =>
          acc + (c.score ?? 0),
        0
      ) /
        Math.max(
          candidates.length,
          1
        )
    );

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">

      {/* BACKGROUND GLOW */}

      <div className="absolute inset-0 -z-10">

        <div className="absolute left-[-120px] top-[-120px] h-[350px] w-[350px] rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="absolute bottom-[-150px] right-[-100px] h-[400px] w-[400px] rounded-full bg-blue-500/10 blur-3xl" />

      </div>

      <div className="mx-auto max-w-7xl p-8">

        {/* HEADER */}

        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-sm uppercase tracking-[0.3em] text-emerald-500">
              Infinia Recruiter OS
            </p>

            <h1 className="mt-3 text-5xl font-semibold tracking-tight">
              Candidate Pipeline
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
              Autonomous recruiter intelligence system analyzing candidate
              communication, confidence, technical signal, recruiter fit,
              and hiring probability in real time.
            </p>

          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900/80 px-6 py-5 backdrop-blur">

            <p className="text-sm text-zinc-400">
              Total Candidates
            </p>

            <p className="mt-2 text-4xl font-bold">
              {totalCandidates}
            </p>

          </div>

        </div>

        {/* ANALYTICS */}

        <div className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">

            <p className="text-sm text-zinc-400">
              Hires
            </p>

            <p className="mt-3 text-4xl font-bold text-green-400">
              {hireCount}
            </p>

          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">

            <p className="text-sm text-zinc-400">
              Human Review
            </p>

            <p className="mt-3 text-4xl font-bold text-yellow-400">
              {reviewCount}
            </p>

          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">

            <p className="text-sm text-zinc-400">
              Rejected
            </p>

            <p className="mt-3 text-4xl font-bold text-red-400">
              {rejectCount}
            </p>

          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">

            <p className="text-sm text-zinc-400">
              Average Score
            </p>

            <p className="mt-3 text-4xl font-bold">
              {averageScore}
            </p>

          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">

            <p className="text-sm text-zinc-400">
              Low Signal
            </p>

            <p className="mt-3 text-4xl font-bold text-orange-400">
              {lowSignalCount}
            </p>

          </div>

        </div>

        {/* EMPTY STATE */}

        {candidates.length === 0 ? (

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-16 text-center">

            <h2 className="text-2xl font-semibold">
              No candidates yet
            </h2>

            <p className="mt-4 text-zinc-400">
              Complete interviews to populate your recruiter pipeline.
            </p>

          </div>

        ) : (

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            {candidates.map(
              (candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                />
              )
            )}

          </div>

        )}

      </div>
    </main>
  );
}