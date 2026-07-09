import { getUserByEmail } from "@/lib/data";
import type { User } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

/** Current staff profile linked to the Supabase Auth session (matched by email). */
export async function getActiveUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) return null;

  return getUserByEmail(authUser.email);
}

export async function getAuthEmail(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}
