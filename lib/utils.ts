export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-PH", {
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
  const target = new Date(date);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
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
