import "server-only";

export type ServerEnvDiagnostics = {
  geminiConfigured: boolean;
  supabaseConfigured: boolean;
  supabaseUsesPublicUrlPrefix: boolean;
};

export function getServerEnvDiagnostics(): ServerEnvDiagnostics {
  const supabaseUrl =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  return {
    geminiConfigured: Boolean(
      process.env.GEMINI_API_KEY?.trim()
    ),
    supabaseConfigured: Boolean(
      supabaseUrl?.trim() &&
        process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    ),
    supabaseUsesPublicUrlPrefix: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
        !process.env.SUPABASE_URL?.trim()
    ),
  };
}
