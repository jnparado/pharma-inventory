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

/** Standard product unit-of-measure codes (abbreviations only in UI). */
export const PRODUCT_UOM_OPTIONS = [
  { value: "pcs", label: "pcs" },
  { value: "vial", label: "vial" },
  { value: "box", label: "box" },
  { value: "btl", label: "btl" },
] as const;

export type ProductUom = (typeof PRODUCT_UOM_OPTIONS)[number]["value"];

const PRODUCT_UOM_ALIASES: Record<string, ProductUom> = {
  pcs: "pcs",
  pc: "pcs",
  piece: "pcs",
  pieces: "pcs",
  vial: "vial",
  vials: "vial",
  vls: "vial",
  box: "box",
  boxes: "box",
  bxs: "box",
  btl: "btl",
  bottle: "btl",
  bottles: "btl",
};

export function normalizeProductUom(unit: unknown): ProductUom | null {
  const raw = String(unit ?? "").trim().toLowerCase();
  if (!raw) return "pcs";
  if (PRODUCT_UOM_ALIASES[raw]) return PRODUCT_UOM_ALIASES[raw];
  if (/^\d+$/.test(raw)) return "pcs";
  return null;
}

export function formatProductUom(unit: string | null | undefined): string {
  const normalized = normalizeProductUom(unit);
  if (!normalized) {
    const raw = String(unit ?? "").trim();
    return raw ? raw.toUpperCase() : "PCS";
  }
  const option = PRODUCT_UOM_OPTIONS.find((o) => o.value === normalized);
  return option?.label ?? normalized.toUpperCase();
}

/** Parse UOM as piece count (legacy text like "pcs" → 1). */
export function parseUnitPieces(unit: unknown): number | null {
  const raw = String(unit ?? "").trim();
  if (!raw) return 1;
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    return n > 0 ? n : null;
  }
  const lower = raw.toLowerCase();
  if (lower === "pcs" || lower === "pc" || lower === "piece" || lower === "pieces") {
    return 1;
  }
  const match = raw.match(/(\d+)/);
  if (match) {
    const n = Number(match[1]);
    return n > 0 ? n : null;
  }
  return null;
}

export function formatUnitPieces(unit: string | null | undefined): number {
  return parseUnitPieces(unit) ?? 1;
}

/** Label shown after stock quantity (inventory is counted in pieces). */
export function stockQuantityLabel(): string {
  return "pcs";
}
