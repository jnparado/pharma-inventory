export const STATIC_AUTH_COOKIE = "pharma_static_auth";

const DEFAULT_EMAIL = "paradojeson@gmail.com";
const DEFAULT_PASSWORD = "123456";

export function getStaticLoginEmail(): string {
  return (
    process.env.STATIC_LOGIN_EMAIL?.trim().toLowerCase() || DEFAULT_EMAIL
  );
}

export function getStaticLoginPassword(): string {
  return process.env.STATIC_LOGIN_PASSWORD ?? DEFAULT_PASSWORD;
}

export function isStaticLogin(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === getStaticLoginEmail() &&
    password === getStaticLoginPassword()
  );
}

export function isStaticAuthCookie(value: string | undefined): boolean {
  return value?.toLowerCase() === getStaticLoginEmail();
}

export function staticAuthUserProfile() {
  return {
    id: "static-admin",
    full_name: "JP",
    email: getStaticLoginEmail(),
    role: "admin",
    branch_id: null as string | null,
    created_at: null as string | null,
  };
}
