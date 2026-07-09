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

/** Current staff profile for static or Supabase Auth session. */
export async function getActiveUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const staticCookie = cookieStore.get(STATIC_AUTH_COOKIE)?.value;

  if (isStaticAuthCookie(staticCookie)) {
    const email = getStaticLoginEmail();
    const profile = await getUserByEmail(email);
    return profile ?? staticAuthUserProfile();
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

export async function getAuthEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const staticCookie = cookieStore.get(STATIC_AUTH_COOKIE)?.value;
  if (isStaticAuthCookie(staticCookie)) {
    return getStaticLoginEmail();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}

export async function getAuthUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const staticCookie = cookieStore.get(STATIC_AUTH_COOKIE)?.value;
  if (isStaticAuthCookie(staticCookie)) {
    const profile = await getActiveUser();
    return profile?.id ?? "static-admin";
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
