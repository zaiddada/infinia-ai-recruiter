import type { EvaluationScores, ParsedEvaluation } from "@/app/types/interview";

function extractSection(markdown: string, header: string): string {
  const regex = new RegExp(
    `##\\s*${header}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`,
    "i"
  );
  const match = markdown.match(regex);
  return match?.[1]?.trim() ?? "";
}

function parseTableScores(markdown: string): Partial<EvaluationScores> {
  const scores: Partial<EvaluationScores> = {};
  const rows = markdown.split("\n");

  const map: [string, keyof EvaluationScores][] = [
    ["communication", "communication"],
    ["technical", "technical"],
    ["confidence", "confidence"],
    ["growth", "growthPotential"],
    ["culture", "cultureFit"],
    ["overall", "overall"],
  ];

  for (const line of rows) {
    if (!line.includes("|")) continue;
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 2) continue;
    const dim = cells[0].toLowerCase();
    if (dim.includes("dimension") || dim.includes("---")) continue;
    const scoreCell = cells[1];
    const num = scoreCell.match(/(\d{1,2})/);
    if (!num) continue;
    const value = Number(num[1]);
    if (value < 0 || value > 10) continue;

    for (const [needle, key] of map) {
      if (dim.includes(needle)) {
        scores[key] = value;
        break;
      }
    }
  }

  return scores;
}

function parseBulletList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.length > 0 && !line.startsWith("|"));
}

export function parseEvaluation(markdown: string): ParsedEvaluation {
  const trimmed = markdown.trim();
  if (trimmed.startsWith("{")) {
    try {
      const json = JSON.parse(trimmed) as Partial<ParsedEvaluation> & {
        scores?: EvaluationScores;
      };
      return {
        status: json.status,
        confidence: json.confidence,
        transcriptSufficiency: json.transcriptSufficiency,
        evidenceCoverage: json.evidenceCoverage,
        uncertaintyIndicators: json.uncertaintyIndicators ?? [],
        message: json.message,
        recommendedAction: json.recommendedAction,
        observedFacts: json.observedFacts ?? [],
        overview: json.overview ?? "",
        scores: json.scores ?? {},
        keyObservations: json.keyObservations ?? [],
        growthPotential: json.growthPotential ?? "",
        cultureFit: json.cultureFit ?? "",
        hiringRecommendation: json.hiringRecommendation ?? "",
        recruiterSummary: json.recruiterSummary ?? "",
        coachingSuggestions: json.coachingSuggestions ?? [],
        rawMarkdown: markdown,
      };
    } catch {
      // fallback to markdown parser below
    }
  }

  const scoresSection =
    extractSection(markdown, "Scores") || markdown;
  const tableScores = parseTableScores(scoresSection);

  const scores: EvaluationScores = {
    communication: tableScores.communication,
    technical: tableScores.technical,
    confidence: tableScores.confidence,
    growthPotential: tableScores.growthPotential,
    cultureFit: tableScores.cultureFit,
    overall: tableScores.overall,
  };

  const overview =
    extractSection(markdown, "Candidate Overview") ||
    extractSection(markdown, "Overview");

  const keyObservations = parseBulletList(
    extractSection(markdown, "Key Observations")
  );

  const coachingSuggestions = parseBulletList(
    extractSection(markdown, "Coaching Suggestions")
  );

  return {
    overview,
    scores,
    keyObservations,
    growthPotential: extractSection(markdown, "Growth Potential"),
    cultureFit: extractSection(markdown, "Culture Fit"),
    hiringRecommendation: extractSection(
      markdown,
      "Hiring Recommendation"
    ),
    recruiterSummary: extractSection(markdown, "Recruiter Summary"),
    coachingSuggestions,
    rawMarkdown: markdown,
  };
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
