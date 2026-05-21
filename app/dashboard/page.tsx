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
      <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[#030303] px-6 text-white">
        <div className="relative w-full max-w-2xl overflow-hidden rounded-[40px] border border-red-500/10 bg-white/[0.03] p-10 backdrop-blur-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-transparent" />

          <div className="relative z-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300">
              <div className="h-2 w-2 rounded-full bg-red-400" />
              Recruiter System Error
            </div>

            <h1 className="text-4xl font-semibold tracking-tight text-white">
              Unable to load recruiter dashboard
            </h1>

            <p className="mt-5 max-w-xl text-[15px] leading-7 text-zinc-500">
              The AI recruiter platform could not fetch candidate intelligence
              reports from the pipeline.
            </p>

            <div className="mt-7 rounded-3xl border border-white/[0.06] bg-black/30 p-5">
              <p className="text-sm leading-7 text-zinc-400">
                {error.message}
              </p>
            </div>
          </div>
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
    <main className="relative min-h-screen overflow-hidden bg-[#030303] text-white">
      {/* PREMIUM BACKGROUND */}

      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-200px] top-[-200px] h-[620px] w-[620px] rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="absolute right-[-200px] top-[10%] h-[560px] w-[560px] rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="absolute bottom-[-240px] left-[20%] h-[520px] w-[520px] rounded-full bg-teal-500/10 blur-3xl" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_38%)]" />

        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_48px]" />

        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_100%]" />

        <div className="absolute inset-0 bg-black/30" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        {/* HERO */}

        <div className="mb-20 flex flex-col gap-12 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-300 backdrop-blur-2xl">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Autonomous AI Recruiter Active
            </div>

            <h1 className="mt-8 max-w-5xl text-6xl font-semibold leading-[0.92] tracking-[-0.06em] text-white sm:text-7xl lg:text-[84px]">
              AI recruiter that interviews, evaluates, and scores candidates in real time.
            </h1>

            <p className="mt-8 max-w-3xl text-lg leading-8 text-zinc-400 sm:text-xl">
              Conduct live AI voice interviews, generate recruiter-grade
              evaluations, analyze behavioral and communication signals, and
              streamline hiring decisions with structured intelligence reports.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-white/[0.06] bg-white/[0.03] px-5 py-2.5 text-sm text-zinc-300 backdrop-blur-xl">
                Real-time AI Interviews
              </div>

              <div className="rounded-full border border-white/[0.06] bg-white/[0.03] px-5 py-2.5 text-sm text-zinc-300 backdrop-blur-xl">
                Recruiter-grade Analysis
              </div>

              <div className="rounded-full border border-white/[0.06] bg-white/[0.03] px-5 py-2.5 text-sm text-zinc-300 backdrop-blur-xl">
                Behavioral Intelligence
              </div>

              <div className="rounded-full border border-white/[0.06] bg-white/[0.03] px-5 py-2.5 text-sm text-zinc-300 backdrop-blur-xl">
                Hiring Recommendations
              </div>
            </div>
          </div>

          {/* TOTAL CARD */}

          <div className="relative w-full max-w-sm overflow-hidden rounded-[36px] border border-white/[0.06] bg-white/[0.03] p-8 backdrop-blur-3xl">
            <div className="absolute right-[-60px] top-[-60px] h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

            <div className="absolute left-[-60px] bottom-[-60px] h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">
                    Total Candidates
                  </p>

                  <p className="mt-5 text-7xl font-semibold tracking-tight text-white">
                    {totalCandidates}
                  </p>
                </div>

                <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-emerald-500/20 bg-emerald-500/10 shadow-[0_0_60px_rgba(16,185,129,0.2)]">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
                </div>
              </div>

              <div className="mt-8">
                <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-zinc-500">
                  <span>Pipeline Activity</span>
                  <span>Live</span>
                </div>

                <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="h-full w-[76%] rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.4)]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ANALYTICS */}

        <div className="mb-16 grid gap-6 md:grid-cols-2 xl:grid-cols-12">
          {/* HIRE */}

          <div className="group relative overflow-hidden rounded-[34px] border border-white/[0.06] bg-white/[0.03] p-8 backdrop-blur-3xl transition-all duration-500 hover:-translate-y-1 hover:border-green-500/20 hover:shadow-[0_30px_100px_rgba(16,185,129,0.10)] xl:col-span-3">
            <div className="absolute right-[-40px] top-[-40px] h-40 w-40 rounded-full bg-green-500/10 blur-3xl" />

            <div className="relative z-10">
              <p className="text-sm font-medium text-zinc-500">
                Strong Hires
              </p>

              <p className="mt-5 text-6xl font-semibold tracking-tight text-green-400">
                {hireCount}
              </p>

              <div className="mt-7 h-[3px] overflow-hidden rounded-full bg-white/[0.05]">
                <div className="h-full w-[78%] rounded-full bg-green-400 shadow-[0_0_25px_rgba(16,185,129,0.4)]" />
              </div>
            </div>
          </div>

          {/* REVIEW */}

          <div className="group relative overflow-hidden rounded-[34px] border border-white/[0.06] bg-white/[0.03] p-8 backdrop-blur-3xl transition-all duration-500 hover:-translate-y-1 hover:border-yellow-500/20 hover:shadow-[0_30px_100px_rgba(234,179,8,0.10)] xl:col-span-2">
            <div className="absolute right-[-40px] top-[-40px] h-32 w-32 rounded-full bg-yellow-500/10 blur-3xl" />

            <p className="relative z-10 text-sm font-medium text-zinc-500">
              Human Review
            </p>

            <p className="relative z-10 mt-5 text-5xl font-semibold tracking-tight text-yellow-400">
              {reviewCount}
            </p>

            <div className="relative z-10 mt-7 h-[3px] overflow-hidden rounded-full bg-white/[0.05]">
              <div className="h-full w-[52%] rounded-full bg-yellow-400" />
            </div>
          </div>

          {/* REJECT */}

          <div className="group relative overflow-hidden rounded-[34px] border border-white/[0.06] bg-white/[0.03] p-8 backdrop-blur-3xl transition-all duration-500 hover:-translate-y-1 hover:border-red-500/20 hover:shadow-[0_30px_100px_rgba(239,68,68,0.10)] xl:col-span-2">
            <div className="absolute right-[-40px] top-[-40px] h-32 w-32 rounded-full bg-red-500/10 blur-3xl" />

            <p className="relative z-10 text-sm font-medium text-zinc-500">
              Rejected
            </p>

            <p className="relative z-10 mt-5 text-5xl font-semibold tracking-tight text-red-400">
              {rejectCount}
            </p>

            <div className="relative z-10 mt-7 h-[3px] overflow-hidden rounded-full bg-white/[0.05]">
              <div className="h-full w-[42%] rounded-full bg-red-400" />
            </div>
          </div>

          {/* SCORE */}

          <div className="group relative overflow-hidden rounded-[34px] border border-white/[0.06] bg-white/[0.03] p-8 backdrop-blur-3xl transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_30px_100px_rgba(255,255,255,0.06)] xl:col-span-3">
            <div className="absolute right-[-40px] top-[-40px] h-40 w-40 rounded-full bg-white/5 blur-3xl" />

            <p className="relative z-10 text-sm font-medium text-zinc-500">
              Average Score
            </p>

            <p className="relative z-10 mt-5 text-6xl font-semibold tracking-tight text-white">
              {averageScore}
            </p>

            <div className="relative z-10 mt-7 h-[3px] overflow-hidden rounded-full bg-white/[0.05]">
              <div className="h-full w-[68%] rounded-full bg-white" />
            </div>
          </div>

          {/* LOW SIGNAL */}

          <div className="group relative overflow-hidden rounded-[34px] border border-white/[0.06] bg-white/[0.03] p-8 backdrop-blur-3xl transition-all duration-500 hover:-translate-y-1 hover:border-orange-500/20 hover:shadow-[0_30px_100px_rgba(249,115,22,0.10)] xl:col-span-2">
            <div className="absolute right-[-40px] top-[-40px] h-32 w-32 rounded-full bg-orange-500/10 blur-3xl" />

            <p className="relative z-10 text-sm font-medium text-zinc-500">
              Low Signal
            </p>

            <p className="relative z-10 mt-5 text-5xl font-semibold tracking-tight text-orange-400">
              {lowSignalCount}
            </p>

            <div className="relative z-10 mt-7 h-[3px] overflow-hidden rounded-full bg-white/[0.05]">
              <div className="h-full w-[28%] rounded-full bg-orange-400" />
            </div>
          </div>
        </div>

        {/* SECTION HEADER */}

        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-4xl font-semibold tracking-tight text-white">
              Candidate Intelligence Reports
            </h2>

            <p className="mt-3 max-w-2xl text-zinc-500">
              Structured recruiter evaluations generated through live AI voice
              interviews, behavioral analysis, and hiring intelligence scoring.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-white/[0.06] bg-white/[0.03] px-5 py-3 text-sm text-zinc-400 backdrop-blur-2xl">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Live recruiter pipeline active
          </div>
        </div>

        {/* SEARCH + FILTERS */}

        <div className="mb-12 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <input
              placeholder="Search candidate reports..."
              className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-zinc-600 focus:border-emerald-500/30 focus:bg-white/[0.05] focus:shadow-[0_0_30px_rgba(16,185,129,0.08)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-300 transition-all duration-300 hover:bg-emerald-500/20">
              All Candidates
            </button>

            <button className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-3 text-sm text-zinc-300 transition-all duration-300 hover:bg-white/[0.05]">
              Strong Hires
            </button>

            <button className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-3 text-sm text-zinc-300 transition-all duration-300 hover:bg-white/[0.05]">
              Human Review
            </button>
          </div>
        </div>

        {/* EMPTY STATE */}

        {candidates.length === 0 ? (
          <div className="relative overflow-hidden rounded-[40px] border border-white/[0.06] bg-white/[0.03] px-10 py-28 text-center backdrop-blur-3xl">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent" />

            <div className="relative z-10">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03]">
                <div className="h-4 w-4 animate-pulse rounded-full bg-emerald-400" />
              </div>

              <h2 className="mt-8 text-4xl font-semibold tracking-tight text-white">
                Recruiter pipeline is empty
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-zinc-500">
                Complete your first AI voice interview to generate recruiter
                intelligence reports, communication analysis, behavioral
                signals, and structured hiring recommendations.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-7 md:grid-cols-2 2xl:grid-cols-3">
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