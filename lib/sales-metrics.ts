import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isSchemaError,
  SALE_WITH_ITEMS_SELECTS,
} from "@/lib/supabase/schema-fallback";
import type { SaleWithItems, SalesReportSummary } from "@/lib/types";

function computeSalesSummary(sales: SaleWithItems[]): SalesReportSummary {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let todayTotal = 0,
    todayCount = 0,
    weekTotal = 0,
    weekCount = 0,
    monthTotal = 0,
    monthCount = 0,
    allTimeTotal = 0;

  const productStats = new Map<
    string,
    { product_name: string; sku: string; qty_sold: number; revenue: number }
  >();

  for (const sale of sales) {
    const amount = Number(sale.total_amount) || 0;
    const created = sale.created_at ? new Date(sale.created_at) : null;
    allTimeTotal += amount;

    if (created && created >= startOfDay) {
      todayTotal += amount;
      todayCount++;
    }
    if (created && created >= startOfWeek) {
      weekTotal += amount;
      weekCount++;
    }
    if (created && created >= startOfMonth) {
      monthTotal += amount;
      monthCount++;
    }

    for (const item of sale.sale_items ?? []) {
      const key = item.product_id ?? item.id;
      const existing = productStats.get(key) ?? {
        product_name: item.products?.product_name ?? "Unknown",
        sku: item.products?.sku ?? "—",
        qty_sold: 0,
        revenue: 0,
      };
      existing.qty_sold += item.quantity;
      existing.revenue +=
        Number(item.subtotal) || item.quantity * item.unit_price;
      productStats.set(key, existing);
    }
  }

  const top_products = [...productStats.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    today_total: todayTotal,
    today_count: todayCount,
    week_total: weekTotal,
    week_count: weekCount,
    month_total: monthTotal,
    month_count: monthCount,
    all_time_total: allTimeTotal,
    top_products,
  };
}

/** One cached sales fetch shared by dashboard and reports. */
export const getSalesMetrics = cache(async () => {
  const supabase = createAdminClient();

  for (const select of SALE_WITH_ITEMS_SELECTS) {
    const { data, error } = await supabase
      .from("sales")
      .select(select)
      .order("created_at", { ascending: false })
      .limit(500);

    if (!error) {
      const sales = (data ?? []) as unknown as SaleWithItems[];
      return {
        sales,
        summary: computeSalesSummary(sales),
      };
    }

    if (!isSchemaError(error.message)) break;
  }

  return {
    sales: [] as SaleWithItems[],
    summary: computeSalesSummary([]),
  };
});
