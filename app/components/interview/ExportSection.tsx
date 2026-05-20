"use client";

import { useState } from "react";
import { Check, Copy, FileText } from "lucide-react";

import type { ParsedEvaluation } from "@/app/types/interview";

export function ExportSection({
  markdown,
  parsed,
}: {
  markdown: string;
  parsed: ParsedEvaluation | null;
}) {
  const [copied, setCopied] = useState<"md" | "summary" | null>(null);

  const summaryText = parsed
    ? [
        "=== AI RECRUITER BRIEF ===",
        "",
        parsed.overview && `Overview:\n${parsed.overview}`,
        "",
        parsed.recruiterSummary &&
          `Summary:\n${parsed.recruiterSummary}`,
        "",
        parsed.hiringRecommendation &&
          `Recommendation:\n${parsed.hiringRecommendation}`,
        "",
        parsed.keyObservations.length > 0 &&
          `Observations:\n${parsed.keyObservations.map((o) => `• ${o}`).join("\n")}`,
      ]
        .filter(Boolean)
        .join("\n\n")
    : markdown;

  async function copy(text: string, kind: "md" | "summary") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
        <FileText className="h-4 w-4 text-zinc-400" />
        Recruiter export
      </div>
      <p className="mb-4 text-xs text-zinc-500">
        Copy structured notes for your ATS, email, or hiring manager packet.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copy(markdown, "md")}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/10"
        >
          {copied === "md" ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          Full evaluation (Markdown)
        </button>
        <button
          type="button"
          onClick={() => copy(summaryText, "summary")}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/10"
        >
          {copied === "summary" ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          Executive summary
        </button>
      </div>
    </div>
  );
}
