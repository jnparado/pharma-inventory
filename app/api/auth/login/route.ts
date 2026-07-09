import { NextResponse } from "next/server";
import { ensureUserProfileFromAuth } from "@/lib/auth-users";
import {
  STATIC_AUTH_COOKIE,
  getStaticLoginEmail,
  isStaticLogin,
} from "@/lib/static-auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    next?: string;
  };

  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const next = String(body.next ?? "/").trim() || "/";
  const destination = next.startsWith("/") ? next : "/";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Enter email and password" },
      { status: 400 }
    );
  }

  if (isStaticLogin(email, password)) {
    const response = NextResponse.json({ ok: true, next: destination });
    response.cookies.set(STATIC_AUTH_COOKIE, getStaticLoginEmail(), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (data.user) {
    await ensureUserProfileFromAuth(data.user);
  }

  const response = NextResponse.json({ ok: true, next: destination });
  response.cookies.delete(STATIC_AUTH_COOKIE);
  return response;
}
