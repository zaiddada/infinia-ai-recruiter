"use client";

import { useMemo, useState } from "react";

import { CandidateCard } from "@/components/dashboard/CandidateCard";
import { DashboardControls } from "@/components/dashboard/DashboardControls";

type Props = {
  candidates: any[];
};

export function RecruiterDashboardClient({
  candidates,
}: Props) {

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  const filteredCandidates =
    useMemo(() => {

      return candidates.filter(
        (candidate) => {

          const matchesSearch =
            (
              candidate.candidate_name ??
              ""
            )
              .toLowerCase()
              .includes(
                search.toLowerCase()
              );

          if (!matchesSearch)
            return false;

          if (filter === "hire") {
            return (
              candidate.recommendation ===
                "Hire" ||
              candidate.recommendation ===
                "Strong Hire"
            );
          }

          if (filter === "review") {
            return (
              candidate.recommendation ===
                "Hold / Human Review" ||
              candidate.recommendation ===
                "Maybe"
            );
          }

          if (filter === "reject") {
            return (
              candidate.recommendation ===
              "Reject"
            );
          }

          if (
            filter === "low-signal"
          ) {
            return candidate.low_signal;
          }

          return true;
        }
      );
    }, [
      candidates,
      search,
      filter,
    ]);

  return (
    <>

      <DashboardControls
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

        {filteredCandidates.map(
          (candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
            />
          )
        )}

      </div>

    </>
  );
}