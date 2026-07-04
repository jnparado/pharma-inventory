import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/env";

/**
 * Server-only Supabase client. Uses the service role key (bypasses RLS) when
 * available, falling back to the anon key. Never import this in client code.
 */
export function createAdminClient() {
  return createSupabaseClient(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey() || getSupabaseAnonKey(),
    { auth: { persistSession: false } }
  );
}
