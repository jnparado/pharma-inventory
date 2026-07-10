import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  STATIC_AUTH_COOKIE,
  isStaticAuthCookie,
} from "@/lib/static-auth";

function authEnabled(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return (
    url.startsWith("https://") &&
    !url.includes("your-project-ref") &&
    key.length > 20 &&
    !key.startsWith("your-")
  );
}

export async function middleware(request: NextRequest) {
  if (!authEnabled()) {
    return NextResponse.next();
  }

  const staticSession = request.cookies.get(STATIC_AUTH_COOKIE)?.value;
  const hasStaticAuth = isStaticAuthCookie(staticSession);
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/login";
  const isAuthCallback = pathname.startsWith("/auth/");
  const isLoginApi = pathname === "/api/auth/login";

  if (hasStaticAuth) {
    if (!isLogin && !isAuthCallback && !isLoginApi) {
      return NextResponse.next();
    }
    if (isLogin) {
      const url = request.nextUrl.clone();
      url.pathname = request.nextUrl.searchParams.get("next") || "/";
      url.searchParams.delete("next");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

  if (!isAuthenticated && !isLogin && !isAuthCallback && !isLoginApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") {
      url.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = request.nextUrl.searchParams.get("next") || "/";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth/sync|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
