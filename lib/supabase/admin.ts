import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client. Uses the service role key (bypasses RLS) when
 * available, falling back to the anon key. Never import this in client code.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
