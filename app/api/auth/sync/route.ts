import { NextResponse } from "next/server";
import { ensureUserProfileFromAuth } from "@/lib/auth-users";
import { createClient } from "@/lib/supabase/server";

/** Link Supabase Auth session to public.users after client-side login. */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await ensureUserProfileFromAuth(user);
  return NextResponse.json({ ok: true });
}
