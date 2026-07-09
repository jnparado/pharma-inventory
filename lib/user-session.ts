import { ensureUserProfileFromAuth } from "@/lib/auth-users";
import { getUserByEmail, getUserById } from "@/lib/data";
import type { User } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

/** Current staff profile for the Supabase Auth session (matched by auth user id). */
export async function getActiveUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  if (authUser.id) {
    const byId = await getUserById(authUser.id);
    if (byId) return byId;
  }

  if (authUser.email) {
    const byEmail = await getUserByEmail(authUser.email);
    if (byEmail) return byEmail;
  }

  return ensureUserProfileFromAuth(authUser);
}

export async function getAuthEmail(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}

export async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
