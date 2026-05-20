export type InterviewPhase =
  | "idle"
  | "connecting"
  | "active"
  | "processing"
  | "complete"
  | "error";

export type TranscriptMessage = {
  id: string;
  role: string;
  transcript: string;
  timestamp: number;
};

export type EvaluationScores = {
  communication?: number;
  technical?: number;
  confidence?: number;
  growthPotential?: number;
  cultureFit?: number;
  overall?: number;
};

export type ParsedEvaluation = {
  status?: "sufficient_data" | "insufficient_data" | "partial_signal";
  confidence?: "low" | "medium" | "high";
  transcriptSufficiency?: "low" | "medium" | "high";
  evidenceCoverage?: number;
  uncertaintyIndicators?: string[];
  message?: string;
  recommendedAction?: string;
  observedFacts?: string[];
  overview: string;
  scores: EvaluationScores;
  keyObservations: string[];
  growthPotential: string;
  cultureFit: string;
  hiringRecommendation: string;
  recruiterSummary: string;
  coachingSuggestions: string[];
  rawMarkdown: string;
};

export type EvaluateResponse = {
  ok: boolean;
  code?: string;
  error?: string;
  evaluation?: string;
  parsed?: ParsedEvaluation;
};

export type TranscriptStats = {
  wordCount: number;
  lineCount: number;
  candidateTurns: number;
  assistantTurns: number;
  candidateWordShare: number;
  durationSeconds: number;
};
