import "server-only";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

const SUPABASE_FETCH_TIMEOUT_MS = 12_000;

let client: SupabaseClient | null = null;

function createTimedFetch(): typeof fetch {
  return (input, init) =>
    fetch(input, {
      ...init,
      signal: AbortSignal.timeout(
        SUPABASE_FETCH_TIMEOUT_MS
      ),
    });
}

/**
 * Server-only Supabase admin client (service role).
 * Returns null when env is incomplete so routes can skip persistence.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (client) {
    return client;
  }

  const url = (
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.trim();

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    return null;
  }

  client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: createTimedFetch(),
    },
  });

  return client;
}

export function isSupabaseConfigured(): boolean {
  const url = (
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && key);
}
