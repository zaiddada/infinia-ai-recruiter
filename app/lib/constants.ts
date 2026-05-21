/** Client → /api/evaluate (must cover Gemini + optional Supabase insert retries) */
export const EVALUATE_TIMEOUT_MS = 120_000;

/** Server-side Gemini request timeout (ms) */
export const GEMINI_TIMEOUT_MS = 90_000;

/** Server-side Supabase insert timeout (ms) */
export const SUPABASE_INSERT_TIMEOUT_MS = 30_000;

export const MIN_TRANSCRIPT_CHUNK_LENGTH = 8;

export const ANALYZING_STEPS = [
  "Processing interview transcript",
  "Removing duplicates and speech-to-text noise",
  "Analyzing communication patterns",
  "Assessing technical signals fairly",
  "Generating recruiter-grade evaluation",
  "Finalizing hiring insights",
] as const;

export const VAPI_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "";

export const VAPI_ASSISTANT_ID =
  process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? "";