import { getUserByEmail, getUserById } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@/lib/types";

export type AuthLoginOption = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  has_profile: boolean;
};

/** List Supabase Auth users for the login account picker. */
export async function listAuthUsersForLogin(): Promise<AuthLoginOption[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw new Error(error.message);
  }

  const options: AuthLoginOption[] = [];

  for (const authUser of data?.users ?? []) {
    if (!authUser.email) continue;

    const profile =
      (await getUserById(authUser.id)) ??
      (await getUserByEmail(authUser.email));

    const meta = authUser.user_metadata ?? {};
    options.push({
      id: authUser.id,
      email: authUser.email,
      full_name:
        profile?.full_name ??
        String(meta.full_name ?? meta.name ?? authUser.email.split("@")[0]),
      role: profile?.role ?? String(meta.role ?? "cashier"),
      has_profile: !!profile,
    });
  }

  return options.sort((a, b) => a.full_name.localeCompare(b.full_name));
}

type AuthUserLike = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

/** Ensure a public.users row exists for the signed-in Supabase Auth user. */
export async function ensureUserProfileFromAuth(
  authUser: AuthUserLike
): Promise<User | null> {
  if (!authUser.email) return null;

  const byId = await getUserById(authUser.id);
  if (byId) return byId;

  const byEmail = await getUserByEmail(authUser.email);
  if (byEmail) return byEmail;

  const meta = authUser.user_metadata ?? {};
  const full_name = String(
    meta.full_name ?? meta.name ?? authUser.email.split("@")[0]
  );
  const role = String(meta.role ?? "cashier");

  const supabase = createAdminClient();
  const base = {
    id: authUser.id,
    full_name,
    email: authUser.email,
    role,
  };

  const { data, error } = await supabase
    .from("users")
    .insert(base)
    .select()
    .single();

  if (error) {
    const { data: fallback } = await supabase
      .from("users")
      .select("*")
      .ilike("email", authUser.email)
      .maybeSingle();
    return fallback;
  }

  return data;
}
