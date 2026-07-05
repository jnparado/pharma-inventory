import Link from "next/link";
import type { ReactNode } from "react";

const tones = {
  blue: {
    bg: "bg-indigo-50",
    icon: "bg-indigo-100 text-indigo-600",
    value: "text-indigo-700",
  },
  green: {
    bg: "bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-600",
    value: "text-emerald-700",
  },
  yellow: {
    bg: "bg-amber-50",
    icon: "bg-amber-100 text-amber-600",
    value: "text-amber-700",
  },
  red: {
    bg: "bg-red-50",
    icon: "bg-red-100 text-red-600",
    value: "text-red-700",
  },
};

export function KpiCard({
  label,
  value,
  tone,
  href,
  icon,
}: {
  label: string;
  value: string | number;
  tone: keyof typeof tones;
  href: string;
  icon: ReactNode;
}) {
  const t = tones[tone];
  return (
    <div className={`rounded-2xl p-5 ${t.bg}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className={`mt-2 text-3xl font-bold ${t.value}`}>{value}</p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${t.icon}`}
        >
          {icon}
        </div>
      </div>
      <Link
        href={href}
        className="mt-4 inline-block text-xs font-medium text-slate-500 hover:text-indigo-600"
      >
        Show Details →
      </Link>
    </div>
  );
}
