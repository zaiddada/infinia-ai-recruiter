/** VAPI assistant ID for the AI recruiter voice agent */
export const VAPI_ASSISTANT_ID =
  "3b3b3eb9-7b63-44ab-85e5-fa64c629879a";

/** Minimum characters for a transcript chunk to be stored */
export const MIN_TRANSCRIPT_CHUNK_LENGTH = 8;

/** Client-side evaluation request timeout (ms) */
export const EVALUATE_TIMEOUT_MS = 90_000;

/** Server-side Gemini request timeout (ms) */
export const GEMINI_TIMEOUT_MS = 75_000;

/** Post-call analyzing step labels */
export const ANALYZING_STEPS = [
  "Processing interview transcript",
  "Removing duplicates and speech-to-text noise",
  "Analyzing communication patterns",
  "Assessing technical signals fairly",
  "Generating recruiter-grade evaluation",
  "Finalizing hiring insights",
] as const;
