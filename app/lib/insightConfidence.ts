import type { TranscriptStats } from "@/app/types/interview";

export type InsightConfidence = "low" | "medium" | "high";

export function computeInsightConfidence(
  stats: TranscriptStats | null,
  scoresParsed: boolean
): { level: InsightConfidence; label: string; percent: number } {
  if (!stats || stats.wordCount < 20) {
    return {
      level: "low",
      label: "Limited data — treat as directional",
      percent: 35,
    };
  }

  let score = 45;
  if (stats.wordCount > 80) score += 20;
  if (stats.wordCount > 200) score += 15;
  if (stats.durationSeconds > 90) score += 10;
  if (stats.candidateTurns >= 4) score += 10;
  if (scoresParsed) score += 10;

  const percent = Math.min(96, score);

  if (percent >= 78) {
    return {
      level: "high",
      label: "Strong signal from conversation depth",
      percent,
    };
  }
  if (percent >= 55) {
    return {
      level: "medium",
      label: "Good coverage — minor gaps possible",
      percent,
    };
  }
  return {
    level: "low",
    label: "Short interview — insights are preliminary",
    percent,
  };
}
