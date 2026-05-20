/** Client → /api/evaluate (must cover Gemini + optional Supabase insert) */
export const EVALUATE_TIMEOUT_MS = 95_000;

/** Server-side Gemini request timeout (ms) */
export const GEMINI_TIMEOUT_MS = 75_000;

/** Server-side Supabase insert timeout (ms) — see lib/supabase/admin.ts */
export const SUPABASE_INSERT_TIMEOUT_MS = 12_000;

export const MIN_TRANSCRIPT_CHUNK_LENGTH = 8;

export const ANALYZING_STEPS = [
  "Processing interview transcript",
  "Removing duplicates and speech-to-text noise",
  "Analyzing communication patterns",
  "Assessing technical signals fairly",
  "Generating recruiter-grade evaluation",
  "Finalizing hiring insights",
] as const;
