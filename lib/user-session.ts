import { cache } from "react";
import { cookies } from "next/headers";
import { ensureUserProfileFromAuth } from "@/lib/auth-users";
import { getUserByEmail, getUserById } from "@/lib/data";
import {
  STATIC_AUTH_COOKIE,
  getStaticLoginEmail,
  isStaticAuthCookie,
  staticAuthUserProfile,
} from "@/lib/static-auth";
import type { User } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

async function resolveAuthUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const staticCookie = cookieStore.get(STATIC_AUTH_COOKIE)?.value;

  if (isStaticAuthCookie(staticCookie)) {
    const email = getStaticLoginEmail();
    try {
      const profile = await getUserByEmail(email);
      return profile ?? staticAuthUserProfile();
    } catch {
      return staticAuthUserProfile();
    }
  }

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

/** Current staff profile for static or Supabase Auth session (deduped per request). */
export const getActiveUser = cache(resolveAuthUser);

export async function getAuthEmail(): Promise<string | null> {
  const user = await getActiveUser();
  return user?.email ?? null;
}

export async function getAuthUserId(): Promise<string | null> {
  const user = await getActiveUser();
  return user?.id ?? null;
}
