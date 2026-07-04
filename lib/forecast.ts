import type { DemandForecast, ProductWithStock, TransactionWithProduct } from "@/lib/types";

/** Seasonal demand multipliers by month (0=Jan). Philippines flu/rainy season patterns. */
const SEASON_FACTORS: Record<number, number> = {
  0: 1.1, // Jan — flu season
  1: 1.15,
  2: 1.05,
  3: 1.0,
  4: 1.0,
  5: 1.1, // Jun — rainy season
  6: 1.15,
  7: 1.1,
  8: 1.05,
  9: 1.0,
  10: 1.05,
  11: 1.1, // Dec — holidays
};

const FLU_CATEGORIES = [
  "analgesic",
  "cough",
  "cold",
  "antihistamine",
  "vitamin",
  "antibiotic",
];

function categorySeasonBoost(category: string | null | undefined): number {
  if (!category) return 1;
  const lower = category.toLowerCase();
  const month = new Date().getMonth();
  const base = SEASON_FACTORS[month] ?? 1;
  const isFluRelated = FLU_CATEGORIES.some((c) => lower.includes(c));
  return isFluRelated && (month <= 2 || month >= 5 && month <= 8) ? base * 1.2 : base;
}

export function computeDemandForecasts(
  products: ProductWithStock[],
  transactions: TransactionWithProduct[],
  days = 90
): DemandForecast[] {
  const cutoff = Date.now() - days * 86_400_000;
  const salesByProduct = new Map<string, number>();

  for (const tx of transactions) {
    if (!tx.product_id) continue;
    const isOut =
      tx.transaction_type.toLowerCase().includes("out") ||
      tx.transaction_type === "sale";
    if (!isOut) continue;
    if (tx.created_at && new Date(tx.created_at).getTime() < cutoff) continue;
    salesByProduct.set(
      tx.product_id,
      (salesByProduct.get(tx.product_id) ?? 0) + tx.quantity
    );
  }

  const today = new Date();
  const reorderBy = new Date(today);
  reorderBy.setDate(reorderBy.getDate() + 7);

  return products.map((p) => {
    const totalSold = salesByProduct.get(p.id) ?? 0;
    const avgDaily = totalSold / days;
    const seasonFactor = categorySeasonBoost(p.categories?.name);
    const predicted30 = Math.ceil(avgDaily * 30 * seasonFactor);
    const reorderLevel = p.reorder_level ?? 10;
    const buffer = Math.ceil(reorderLevel * 0.5);
    const recommended = Math.max(
      reorderLevel + buffer - p.total_stock,
      predicted30 - p.total_stock,
      0
    );

    let status: DemandForecast["status"] = "ok";
    let reason = "Stock levels are healthy for predicted demand.";

    if (p.total_stock === 0) {
      status = "critical";
      reason = "Out of stock — immediate reorder required.";
    } else if (p.total_stock <= reorderLevel) {
      status = "reorder";
      reason = `Below reorder level (${reorderLevel}). Predicted 30-day demand: ${predicted30} units.`;
    } else if (p.total_stock > predicted30 * 2 && predicted30 > 0) {
      status = "overstock";
      reason = `Stock (${p.total_stock}) exceeds 2× predicted demand (${predicted30}). Consider promotions.`;
    } else if (recommended > 0) {
      status = "reorder";
      reason = `Season-adjusted demand suggests reordering ${recommended} units within 7 days.`;
    }

    if (seasonFactor > 1.1 && status === "reorder") {
      reason += ` Seasonal demand boost (${Math.round((seasonFactor - 1) * 100)}%) — e.g. flu/rainy season.`;
    }

    return {
      product_id: p.id,
      product_name: p.product_name,
      sku: p.sku,
      category: p.categories?.name ?? null,
      current_stock: p.total_stock,
      reorder_level: reorderLevel,
      avg_daily_sales: Math.round(avgDaily * 100) / 100,
      predicted_30_day_demand: predicted30,
      recommended_reorder_qty: recommended,
      reorder_by: reorderBy.toISOString().slice(0, 10),
      season_factor: Math.round(seasonFactor * 100) / 100,
      status,
      reason,
    };
  });
}
