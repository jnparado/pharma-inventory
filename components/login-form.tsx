"use client";

import { useState } from "react";
import {
  getStaticLoginEmail,
  getStaticLoginPassword,
} from "@/lib/static-auth";
import { buttonClass, inputClass, labelClass } from "@/components/ui";

export function LoginForm({
  next = "/",
  initialError,
}: {
  next?: string;
  initialError?: string;
}) {
  const [error, setError] = useState(initialError ?? "");
  const [loading, setLoading] = useState(false);

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
      setError("Enter email and password.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next: destination }),
      });

      const data = (await res.json()) as { error?: string; next?: string };

      if (!res.ok) {
        setError(data.error ?? "Sign in failed");
        setLoading(false);
        return;
      }

      window.location.href = data.next ?? destination;
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
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={getStaticLoginEmail()}
            className={inputClass}
            disabled={loading}
          />
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
            defaultValue={getStaticLoginPassword()}
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
