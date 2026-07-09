"use client";

import { useState } from "react";
import type { AuthLoginOption } from "@/lib/auth-users";
import { createClient } from "@/lib/supabase/client";
import { buttonClass, inputClass, labelClass } from "@/components/ui";

export function LoginForm({
  authUsers,
  next = "/",
  initialError,
}: {
  authUsers: AuthLoginOption[];
  next?: string;
  initialError?: string;
}) {
  const [error, setError] = useState(initialError ?? "");
  const [loading, setLoading] = useState(false);
  const usePicker = authUsers.length > 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const destination = String(formData.get("next") ?? "/").trim() || "/";

    if (!email || !password) {
      setError("Select an account and enter your password.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      await fetch("/api/auth/sync", { method: "POST" });

      window.location.href = destination.startsWith("/") ? destination : "/";
    } catch (err) {
      setError((err as Error).message || "Sign in failed");
      setLoading(false);
    }
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className={labelClass} htmlFor="email">
            {usePicker ? "Account" : "Email"}
          </label>
          {usePicker ? (
            <>
              <select
                id="email"
                name="email"
                required
                defaultValue=""
                className={inputClass}
                disabled={loading}
              >
                <option value="" disabled>
                  Select your account…
                </option>
                {authUsers.map((u) => (
                  <option key={u.id} value={u.email}>
                    {u.full_name} ({u.email}) — {u.role}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                Loaded from Supabase Authentication
              </p>
            </>
          ) : (
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@pharmacy.ph"
              className={inputClass}
              disabled={loading}
            />
          )}
        </div>
        <div>
          <label className={labelClass} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className={inputClass}
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={`${buttonClass} w-full disabled:opacity-60`}
        >
          {loading ? "Signing in…" : "Sign in to Dashboard"}
        </button>
      </form>
    </>
  );
}
