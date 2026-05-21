"use client";

type Props = {
  search: string;
  setSearch: (
    value: string
  ) => void;

  filter: string;
  setFilter: (
    value: string
  ) => void;
};

export function DashboardControls({
  search,
  setSearch,
  filter,
  setFilter,
}: Props) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

      <input
        value={search}
        onChange={(e) =>
          setSearch(e.target.value)
        }
        placeholder="Search candidates..."
        className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-5 py-4 text-white outline-none transition focus:border-emerald-500/50 md:max-w-sm"
      />

      <select
        value={filter}
        onChange={(e) =>
          setFilter(e.target.value)
        }
        className="rounded-2xl border border-white/10 bg-zinc-900 px-5 py-4 text-white outline-none"
      >
        <option value="all">
          All Candidates
        </option>

        <option value="hire">
          Hires
        </option>

        <option value="review">
          Human Review
        </option>

        <option value="reject">
          Rejected
        </option>

        <option value="low-signal">
          Low Signal
        </option>
      </select>

    </div>
  );
}