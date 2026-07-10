import { NextResponse } from "next/server";
import { ensureUserProfileFromAuth } from "@/lib/auth-users";
import {
  STATIC_AUTH_COOKIE,
  getStaticLoginEmail,
  isStaticLogin,
} from "@/lib/static-auth";
import { authCookieOptions } from "@/lib/supabase/schema-fallback";
import { createClient } from "@/lib/supabase/server";

function redirectWithCookie(
  request: Request,
  destination: string,
  cookieValue: string | null
) {
  const response = NextResponse.redirect(new URL(destination, request.url));
  if (cookieValue) {
    response.cookies.set(STATIC_AUTH_COOKIE, cookieValue, authCookieOptions());
  } else {
    response.cookies.delete(STATIC_AUTH_COOKIE);
  }
  return response;
}

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
    return redirectWithCookie(request, destination, getStaticLoginEmail());
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
    try {
      await ensureUserProfileFromAuth(data.user);
    } catch {
      // Allow login even if users table is missing columns.
    }
  }

  return redirectWithCookie(request, destination, null);
}
