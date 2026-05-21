export const dynamic = "force-dynamic";

import { CandidateCard } from "@/components/dashboard/CandidateCard";
import { supabaseServer } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const { data, error } = await supabaseServer
    .from("candidate_reports")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center overflow-hidden bg-black px-6 text-white">
        <div className="w-full max-w-2xl rounded-[32px] border border-red-500/20 bg-red-500/10 p-8 backdrop-blur-xl">
          <div className="mb-5 inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400">
            Dashboard Error
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Failed to load recruiter dashboard
          </h1>

          <p className="mt-4 leading-7 text-zinc-400">
            {error.message}
          </p>
        </div>
      </main>
    );
  }

  const candidates = data ?? [];

  const totalCandidates = candidates.length;

  const hireCount = candidates.filter(
    (c) =>
      c.recommendation === "Hire" ||
      c.recommendation === "Strong Hire"
  ).length;

  const rejectCount = candidates.filter(
    (c) => c.recommendation === "Reject"
  ).length;

  const reviewCount = candidates.filter(
    (c) =>
      c.recommendation === "Hold / Human Review" ||
      c.recommendation === "Maybe" ||
      c.recommendation === "Weak Maybe"
  ).length;

  const lowSignalCount = candidates.filter(
    (c) => c.low_signal
  ).length;

  const averageScore = Math.round(
    candidates.reduce(
      (acc, c) => acc + (c.score ?? 0),
      0
    ) / Math.max(candidates.length, 1)
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* BACKGROUND */}

      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-120px] top-[-120px] h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="absolute bottom-[-200px] right-[-120px] h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_40%)]" />

        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_48px]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        {/* HEADER */}

        <div className="mb-14 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 backdrop-blur-xl">
              Infinia Recruiter Intelligence System
            </div>

            <h1 className="mt-6 text-5xl font-bold tracking-tight text-white sm:text-6xl">
              AI Recruiter Dashboard
            </h1>

            <p className="mt-6 text-lg leading-8 text-zinc-400">
              Autonomous recruiter intelligence platform analyzing candidate
              communication, recruiter fit, confidence, behavioral signal,
              and hiring probability in real time.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
              <span>Voice AI Interviews</span>

              <span>•</span>

              <span>Automated Evaluation</span>

              <span>•</span>

              <span>Hiring Recommendations</span>

              <span>•</span>

              <span>Recruiter Intelligence</span>
            </div>
          </div>

          {/* TOTAL CANDIDATES CARD */}

          <div className="w-full max-w-sm rounded-[32px] border border-white/10 bg-white/[0.03] p-7 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
                  Total Candidates
                </p>

                <p className="mt-4 text-5xl font-bold tracking-tight text-white">
                  {totalCandidates}
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        {/* ANALYTICS */}

        <div className="mb-12 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <div className="group rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-green-500/20">
            <p className="text-sm font-medium text-zinc-400">
              Hires
            </p>

            <p className="mt-4 text-5xl font-bold tracking-tight text-green-400">
              {hireCount}
            </p>

            <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-white/5">
              <div className="h-full w-[78%] rounded-full bg-green-400" />
            </div>
          </div>

          <div className="group rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-yellow-500/20">
            <p className="text-sm font-medium text-zinc-400">
              Human Review
            </p>

            <p className="mt-4 text-5xl font-bold tracking-tight text-yellow-400">
              {reviewCount}
            </p>

            <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-white/5">
              <div className="h-full w-[56%] rounded-full bg-yellow-400" />
            </div>
          </div>

          <div className="group rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-red-500/20">
            <p className="text-sm font-medium text-zinc-400">
              Rejected
            </p>

            <p className="mt-4 text-5xl font-bold tracking-tight text-red-400">
              {rejectCount}
            </p>

            <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-white/5">
              <div className="h-full w-[42%] rounded-full bg-red-400" />
            </div>
          </div>

          <div className="group rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20">
            <p className="text-sm font-medium text-zinc-400">
              Average Score
            </p>

            <p className="mt-4 text-5xl font-bold tracking-tight text-white">
              {averageScore}
            </p>

            <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-white/5">
              <div className="h-full w-[68%] rounded-full bg-white" />
            </div>
          </div>

          <div className="group rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/20">
            <p className="text-sm font-medium text-zinc-400">
              Low Signal
            </p>

            <p className="mt-4 text-5xl font-bold tracking-tight text-orange-400">
              {lowSignalCount}
            </p>

            <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-white/5">
              <div className="h-full w-[30%] rounded-full bg-orange-400" />
            </div>
          </div>
        </div>

        {/* CANDIDATE SECTION */}

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Candidate Reports
            </h2>

            <p className="mt-2 text-zinc-500">
              AI generated recruiter evaluations and hiring analysis.
            </p>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-400 backdrop-blur-xl md:flex">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

            Live recruiter pipeline
          </div>
        </div>

        {/* EMPTY STATE */}

        {candidates.length === 0 ? (
          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] px-10 py-20 text-center backdrop-blur-xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/[0.03]">
              <div className="h-4 w-4 rounded-full bg-emerald-400" />
            </div>

            <h2 className="mt-8 text-3xl font-semibold tracking-tight text-white">
              No candidates yet
            </h2>

            <p className="mx-auto mt-4 max-w-xl leading-7 text-zinc-400">
              Complete AI voice interviews to populate your recruiter
              intelligence pipeline and generate hiring reports.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
            {candidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}