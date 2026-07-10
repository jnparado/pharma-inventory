import { createAdminClient } from "@/lib/supabase/admin";
import {
  getExpiringBatches,
  getProductsWithStock,
  getPurchaseOrders,
} from "@/lib/data";
import { getSalesMetrics } from "@/lib/sales-metrics";
import { formatCurrency } from "@/lib/utils";
import type { BatchWithProduct, PurchaseOrder } from "@/lib/types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export async function getDashboardData() {
  const supabase = createAdminClient();
  const [products, metrics, orders, expiringList, customersRes] =
    await Promise.all([
      getProductsWithStock(),
      getSalesMetrics(),
      getPurchaseOrders(),
      getExpiringBatches(6),
      supabase.from("customers").select("id", { count: "exact", head: true }),
    ]);

  const sales = metrics.sales;
  const summary = metrics.summary;
  const outOfStock = products.filter((p) => p.total_stock === 0).length;
  const customerCount = customersRes.count ?? 0;

  const maxExpiringQty = Math.max(
    ...expiringList.map((b) => b.quantity_remaining ?? 0),
    1
  );

  const recentOrders = (orders as PurchaseOrder[]).slice(0, 6);

  const monthlySales = MONTHS.map((month, i) => {
    const total = sales
      .filter((s) => {
        if (!s.created_at) return false;
        const d = new Date(s.created_at);
        return d.getMonth() === i && d.getFullYear() === new Date().getFullYear();
      })
      .reduce((sum, s) => sum + Number(s.total_amount), 0);
    return { month, sales: total };
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaySales = sales.filter(
    (s) => s.created_at && new Date(s.created_at) >= todayStart
  );
  const todayTotal = todaySales.reduce(
    (sum, s) => sum + Number(s.total_amount),
    0
  );

  const paymentColors: Record<string, string> = {
    cash: "#fbbf24",
    gcash: "#3b82f6",
    card: "#ec4899",
    maya: "#22c55e",
  };
  const paymentTotals = new Map<string, number>();
  for (const sale of todaySales) {
    const method = (sale.payment_method ?? "cash").toLowerCase();
    paymentTotals.set(
      method,
      (paymentTotals.get(method) ?? 0) + Number(sale.total_amount)
    );
  }
  const todayBreakdown =
    paymentTotals.size > 0
      ? [...paymentTotals.entries()].map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color: paymentColors[name] ?? "#94a3b8",
        }))
      : [
          { name: "Cash", value: 0, color: "#fbbf24" },
          { name: "GCash", value: 0, color: "#3b82f6" },
          { name: "Card", value: 0, color: "#ec4899" },
        ];

  const estimatedProfit = summary.month_total * 0.35;

  return {
    customerCount,
    totalSales: sales.length,
    totalProfit: estimatedProfit,
    outOfStock,
    expiringList,
    maxExpiringQty,
    recentOrders,
    monthlySales,
    todayBreakdown,
    todayTotal,
    formattedProfit: formatCurrency(estimatedProfit),
  };
}

export type DashboardExpiringRow = BatchWithProduct;
