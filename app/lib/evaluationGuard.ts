import type { TranscriptStats } from "@/app/types/interview";

export type EvaluationInputMeta = {
  durationSeconds?: number;
  candidateWordCount?: number;
  candidateTurns?: number;
  candidateWordShare?: number;
  lineCount?: number;
};

export type TranscriptValidation = {
  status: "sufficient_data" | "insufficient_data";
  confidence: "low" | "medium" | "high";
  message: string;
  recommendedAction: string;
  observedFacts: string[];
  evidenceCoverage: number;
  uncertaintyIndicators: string[];
  metrics: {
    durationSeconds: number;
    candidateWordCount: number;
    candidateTurns: number;
    candidateWordShare: number;
    lineCount: number;
    repetitionRatio: number;
    technicalDepthScore: number;
    transcriptCompleteness: number;
  };
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function uniqueLineRatio(lines: string[]): number {
  if (lines.length === 0) return 0;
  const unique = new Set(lines.map((l) => l.toLowerCase().trim())).size;
  return unique / lines.length;
}

function detectTechnicalDepthScore(transcript: string): number {
  const text = transcript.toLowerCase();
  const keywords = [
    "api",
    "database",
    "frontend",
    "backend",
    "typescript",
    "react",
    "next",
    "algorithm",
    "system design",
    "scalability",
    "testing",
    "deployment",
    "architecture",
    "security",
    "latency",
  ];
  let score = 0;
  for (const k of keywords) {
    if (text.includes(k)) score += 1;
  }
  return clamp(score, 0, 10);
}

function estimateStatsFromTranscript(transcript: string): TranscriptStats {
  const lines = transcript.split("\n").map((l) => l.trim()).filter(Boolean);
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;
  const estimatedDurationSeconds = Math.ceil((wordCount / 130) * 60);

  return {
    wordCount,
    lineCount: lines.length,
    candidateTurns: Math.max(1, Math.floor(lines.length * 0.6)),
    assistantTurns: Math.max(0, lines.length - Math.floor(lines.length * 0.6)),
    candidateWordShare: 60,
    durationSeconds: estimatedDurationSeconds,
  };
}

export function validateTranscriptForEvaluation(
  transcript: string,
  meta?: EvaluationInputMeta
): TranscriptValidation {
  const fallback = estimateStatsFromTranscript(transcript);
  const lines = transcript.split("\n").map((l) => l.trim()).filter(Boolean);
  const repetitionRatio = 1 - uniqueLineRatio(lines);
  const technicalDepthScore = detectTechnicalDepthScore(transcript);

  const durationSeconds = meta?.durationSeconds ?? fallback.durationSeconds;
  const candidateWordCount = meta?.candidateWordCount ?? Math.max(0, Math.round((meta?.candidateWordShare ?? fallback.candidateWordShare) * (fallback.wordCount / 100)));
  const candidateTurns = meta?.candidateTurns ?? fallback.candidateTurns;
  const candidateWordShare = meta?.candidateWordShare ?? fallback.candidateWordShare;
  const lineCount = meta?.lineCount ?? fallback.lineCount;

  const completenessParts = [
    durationSeconds >= 90 ? 1 : 0,
    candidateWordCount >= 120 ? 1 : 0,
    candidateTurns >= 5 ? 1 : 0,
    repetitionRatio < 0.45 ? 1 : 0,
    technicalDepthScore >= 2 ? 1 : 0,
  ];
  const transcriptCompleteness = Math.round(
    (completenessParts.reduce((a, b) => a + b, 0) / completenessParts.length) * 100
  );

  const observedFacts: string[] = [
    `Candidate words: ${candidateWordCount}.`,
    `Candidate turns: ${candidateTurns}.`,
    `Estimated interview duration: ${durationSeconds}s.`,
    `Technical depth score: ${technicalDepthScore}/10.`,
  ];

  const uncertaintyIndicators: string[] = [];
  if (durationSeconds < 90) uncertaintyIndicators.push("Interview duration below reliability threshold.");
  if (candidateWordCount < 120) uncertaintyIndicators.push("Candidate response volume is too low.");
  if (candidateTurns < 5) uncertaintyIndicators.push("Too few candidate turns to assess consistency.");
  if (repetitionRatio >= 0.45) uncertaintyIndicators.push("Transcript appears repetitive.");
  if (technicalDepthScore < 2) uncertaintyIndicators.push("No meaningful technical discussion detected.");
  if (candidateWordShare < 25) uncertaintyIndicators.push("Candidate speaking share is limited.");

  const insufficient = uncertaintyIndicators.length > 0;
  const evidenceCoverage = clamp(
    Math.round(
      ((candidateWordCount >= 120 ? 30 : 10) +
        (candidateTurns >= 5 ? 20 : 8) +
        (durationSeconds >= 90 ? 20 : 8) +
        (technicalDepthScore >= 2 ? 20 : 6) +
        (repetitionRatio < 0.45 ? 10 : 4)) *
        (candidateWordShare < 25 ? 0.7 : 1)
    ),
    0,
    100
  );

  if (insufficient) {
    return {
      status: "insufficient_data",
      confidence: "low",
      message: "Interview too short for reliable evaluation.",
      recommendedAction: "Continue interview for additional signal.",
      observedFacts,
      evidenceCoverage,
      uncertaintyIndicators,
      metrics: {
        durationSeconds,
        candidateWordCount,
        candidateTurns,
        candidateWordShare,
        lineCount,
        repetitionRatio,
        technicalDepthScore,
        transcriptCompleteness,
      },
    };
  }

  const confidence: "low" | "medium" | "high" =
    evidenceCoverage >= 80 ? "high" : evidenceCoverage >= 60 ? "medium" : "low";

  return {
    status: "sufficient_data",
    confidence,
    message: "Transcript has enough signal for evaluation.",
    recommendedAction: "Proceed with evidence-based recruiter analysis.",
    observedFacts,
    evidenceCoverage,
    uncertaintyIndicators: confidence === "high" ? [] : ["Moderate coverage; conclusions should remain cautious."],
    metrics: {
      durationSeconds,
      candidateWordCount,
      candidateTurns,
      candidateWordShare,
      lineCount,
      repetitionRatio,
      technicalDepthScore,
      transcriptCompleteness,
    },
  };
}
