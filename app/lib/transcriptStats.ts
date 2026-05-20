import type { TranscriptMessage, TranscriptStats } from "@/app/types/interview";

const CANDIDATE_ROLES = new Set([
  "user",
  "candidate",
  "customer",
  "human",
]);

function isCandidateRole(role: string): boolean {
  const r = role.toLowerCase();
  return (
    CANDIDATE_ROLES.has(r) ||
    r.includes("user") ||
    r.includes("candidate")
  );
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function computeTranscriptStats(
  messages: TranscriptMessage[],
  durationSeconds: number
): TranscriptStats {
  let candidateWords = 0;
  let assistantWords = 0;
  let candidateTurns = 0;
  let assistantTurns = 0;

  for (const msg of messages) {
    const words = countWords(msg.transcript);
    if (isCandidateRole(msg.role)) {
      candidateWords += words;
      candidateTurns += 1;
    } else {
      assistantWords += words;
      assistantTurns += 1;
    }
  }

  const wordCount = candidateWords + assistantWords;
  const total = wordCount || 1;

  return {
    wordCount,
    lineCount: messages.length,
    candidateTurns,
    assistantTurns,
    candidateWordShare: Math.round((candidateWords / total) * 100),
    durationSeconds,
  };
}
