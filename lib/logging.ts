import "server-only";

export type LogScope =
  | "evaluate"
  | "supabase"
  | "gemini"
  | "app";

export function logServer(
  scope: LogScope,
  event: string,
  details?: Record<string, unknown>
): void {
  const payload = {
    scope,
    event,
    ts: new Date().toISOString(),
    ...details,
  };

  console.info(`[${scope}]`, JSON.stringify(payload));
}

export function logServerError(
  scope: LogScope,
  event: string,
  details?: Record<string, unknown>
): void {
  const payload = {
    scope,
    event,
    ts: new Date().toISOString(),
    ...details,
  };

  console.error(`[${scope}]`, JSON.stringify(payload));
}
