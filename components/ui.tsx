import type { ReactNode } from "react";
import { expiryStatus } from "@/lib/utils";

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
  );
}

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {title && (
        <h2 className="border-b border-slate-100 px-5 py-3.5 text-sm font-semibold text-slate-700">
          {title}
        </h2>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const tones = {
    default: "text-slate-900",
    success: "text-teal-600",
    warning: "text-amber-600",
    danger: "text-red-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${tones[tone]}`}>{value}</p>
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-teal-50 text-teal-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
    info: "bg-blue-50 text-blue-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function ExpiryBadge({ expiryDate }: { expiryDate: string }) {
  const status = expiryStatus(expiryDate);
  if (status === "expired") return <Badge tone="danger">Expired</Badge>;
  if (status === "expiring-30") return <Badge tone="danger">&le; 30 days</Badge>;
  if (status === "expiring-90") return <Badge tone="warning">&le; 90 days</Badge>;
  return <Badge tone="success">OK</Badge>;
}

/** Success/error banner driven by ?success= / ?error= query params. */
export function FlashMessage({
  success,
  error,
}: {
  success?: string;
  error?: string;
}) {
  if (error) {
    return (
      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }
  if (success) {
    return (
      <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
        {success}
      </div>
    );
  }
  return null;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-8 text-center text-sm text-slate-400">{message}</p>
  );
}

export const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20";

export const labelClass = "mb-1 block text-xs font-medium text-slate-600";

export const buttonClass =
  "inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40";

export function SetupNotice() {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="text-lg font-semibold text-amber-800">
        Supabase is not configured yet
      </h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-amber-800">
        <li>
          Create a project at{" "}
          <a
            href="https://supabase.com/dashboard"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            supabase.com/dashboard
          </a>
          .
        </li>
        <li>
          In the SQL Editor, run the contents of{" "}
          <code className="rounded bg-amber-100 px-1">supabase/schema.sql</code>{" "}
          to create the tables and seed data.
        </li>
        <li>
          Copy the Project URL and anon key from Settings &rarr; API into{" "}
          <code className="rounded bg-amber-100 px-1">.env.local</code>.
        </li>
        <li>Restart the dev server.</li>
      </ol>
    </div>
  );
}
