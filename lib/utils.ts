/** Parse YYYY-MM-DD (or ISO datetime) as a local calendar date. */
export function parseLocalDate(date: string | Date): Date {
  if (date instanceof Date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  const iso = String(date).trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  const parsed = new Date(date);
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

export function formatDate(date: string | Date): string {
  return parseLocalDate(date).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

/** Whole days from today until the given date. Negative if already past. */
export function daysUntil(date: string | Date): number {
  const target = parseLocalDate(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Normalize DB date values to YYYY-MM-DD for date inputs. */
export function toDateInputValue(date: string | Date | null | undefined): string {
  if (!date) return "";
  return String(date).trim().slice(0, 10);
}

export type ExpiryStatus = "expired" | "expiring-30" | "expiring-90" | "ok";

export function expiryStatus(expiryDate: string | Date): ExpiryStatus {
  const days = daysUntil(expiryDate);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring-30";
  if (days <= 90) return "expiring-90";
  return "ok";
}

/** Suggested markdown for near-expiry stock so it sells before it's wasted. */
export function suggestedDiscount(expiryDate: string | Date): number {
  const status = expiryStatus(expiryDate);
  if (status === "expiring-30") return 50;
  if (status === "expiring-90") return 20;
  return 0;
}

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase() ?? "";
  return `${first} ${lastInitial}.`;
}
