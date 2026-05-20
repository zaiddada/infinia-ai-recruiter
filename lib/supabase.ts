/**
 * @deprecated Import from `@/lib/supabase/admin` instead.
 */
export {
  getSupabaseAdmin as getSupabase,
  isSupabaseConfigured,
  resetSupabaseAdminClient,
} from "@/lib/supabase/admin";

export {
  persistCandidateReport,
  queueCandidateReportPersist,
  type CandidateReportPayload,
} from "@/lib/supabase/persistReport";
