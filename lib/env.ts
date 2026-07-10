/** Read the first non-empty env var from a list of candidate names. */
function readEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

export function getSupabaseUrl(): string {
  return readEnv("NEXT_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_URL");
}

export function getSupabaseAnonKey(): string {
  return readEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY"
  );
}

export function getSupabaseServiceRoleKey(): string {
  return readEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  return (
    url.startsWith("https://") &&
    !url.includes("your-project-ref") &&
    anonKey.length > 20 &&
    !anonKey.startsWith("your-")
  );
}

/** True when the service role key is available for server-side writes. */
export function hasServiceRoleKey(): boolean {
  const serviceKey = getSupabaseServiceRoleKey();
  return serviceKey.length > 20 && !serviceKey.startsWith("your-");
}

export function isVercel(): boolean {
  return process.env.VERCEL === "1";
}

export function getXaiApiKey(): string {
  return readEnv("XAI_API_KEY");
}

export function getGrokBaseUrl(): string {
  return readEnv("GROK_BASE_URL") || "https://api.x.ai/v1";
}

export function isAiConfigured(): boolean {
  const key = getXaiApiKey();
  return key.length > 10 && !key.startsWith("your-");
}
