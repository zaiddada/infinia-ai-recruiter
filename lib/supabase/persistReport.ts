import "server-only";

import {
  getSupabaseAdmin,
  resetSupabaseAdminClient,
} from "@/lib/supabase/admin";
import {
  logServer,
  logServerError,
} from "@/lib/logging";

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 600;

export type CandidateReportPayload = {
  candidate_name: string;
  transcript: string;
  evaluation: unknown;
  recommendation: string;
  score: number;
  confidence: string;
  transcript_integrity: number;
  low_signal: boolean;
  telemetry: unknown;
  created_at: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableDbError(error: unknown): boolean {
  const message = String(
    error instanceof Error
      ? error.message
      : error ?? ""
  ).toLowerCase();

  return (
    message.includes("timeout") ||
    message.includes("connecttimeout") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("network") ||
    message.includes("fetch failed") ||
    message.includes("aborterror")
  );
}

export async function persistCandidateReport(
  requestId: string,
  payload: CandidateReportPayload
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return { ok: false, error: "not_configured" };
  }

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const { error } = await supabase
        .from("candidate_reports")
        .insert([payload]);

      if (!error) {
        logServer("supabase", "persist_ok", {
          requestId,
          attempt,
        });
        return { ok: true };
      }

      logServerError("supabase", "persist_error", {
        requestId,
        attempt,
        code: error.code,
        message: error.message,
      });

      if (attempt === MAX_ATTEMPTS) {
        return {
          ok: false,
          error: error.message,
        };
      }
    } catch (err) {
      logServerError("supabase", "persist_exception", {
        requestId,
        attempt,
        error:
          err instanceof Error
            ? err.message
            : String(err),
      });

      if (isRetryableDbError(err)) {
        resetSupabaseAdminClient();
      }

      if (attempt === MAX_ATTEMPTS) {
        return {
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : String(err),
        };
      }
    }

    await sleep(
      BASE_BACKOFF_MS * 2 ** (attempt - 1)
    );
  }

  return { ok: false, error: "unknown" };
}

/**
 * Fire-and-forget persistence — never blocks the evaluate HTTP response
 * and never affects the client voice session.
 */
export function queueCandidateReportPersist(
  requestId: string,
  payload: CandidateReportPayload
): void {
  logServer("supabase", "persist_queued", {
    requestId,
  });

  void persistCandidateReport(
    requestId,
    payload
  ).then((result) => {
    if (!result.ok) {
      logServerError("supabase", "persist_failed", {
        requestId,
        error: result.error,
      });
    }
  });
}
