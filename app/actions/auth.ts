"use server";

import { redirect } from "next/navigation";
import { ensureUserProfileFromAuth } from "@/lib/auth-users";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/").trim() || "/";

  if (!email || !password) {
    redirect("/login?error=Select%20an%20account%20and%20enter%20your%20password");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    await ensureUserProfileFromAuth(data.user);
  }

  redirect(next.startsWith("/") ? next : "/");
}
