/**
 * Re-export for imports like `@/lib/transcriptCleaner`.
 * Canonical implementation lives in `app/lib/transcriptCleaner.ts`
 * (shared by App Router API routes and client-safe utilities).
 */

export {
  cleanTranscript,
} from "@/app/lib/transcriptCleaner";