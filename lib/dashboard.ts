import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getExpiringBatches, getProductsWithStock } from "@/lib/data";
import { getSalesAnalytics } from "@/lib/sales-metrics";
import { formatCurrency } from "@/lib/utils";
import type { BatchWithProduct, DashboardInventoryRow, SaleWithItems } from "@/lib/types";

function isRetailSale(sale: SaleWithItems): boolean {
  return (sale.payment_method ?? "").toLowerCase() !== "purchase_order";
}

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

function batchToDashboardRow(batch: BatchWithProduct): DashboardInventoryRow {
  return {
    id: batch.id,
    product_name: batch.products?.product_name ?? "—",
    supplier: batch.suppliers?.company_name ?? null,
    quantity: batch.quantity_remaining ?? 0,
    expiry_date: batch.expiry_date,
    lot_number: batch.batch_number,
    selling_price_ws: null,
    selling_price_retail: Number(batch.products?.selling_price ?? 0),
  };
}

function emptyDashboardData() {
  return {
    customerCount: 0,
    totalSales: 0,
    totalProfit: 0,
    outOfStock: 0,
    expiringList: [] as DashboardInventoryRow[],
    monthlySales: MONTHS.map((month) => ({ month, sales: 0 })),
    todayBreakdown: [
      { name: "Cash", value: 0, color: "#fbbf24" },
      { name: "GCash", value: 0, color: "#3b82f6" },
      { name: "Card", value: 0, color: "#ec4899" },
    ],
    todayTotal: 0,
    formattedProfit: formatCurrency(0),
  };
}

export const getDashboardData = cache(async () => {
  try {
    const supabase = createAdminClient();
    const [products, sales, expiringBatches, customersRes] = await Promise.all([
      getProductsWithStock(),
      getSalesAnalytics(),
      getExpiringBatches(6),
      supabase.from("customers").select("id", { count: "exact", head: true }),
    ]);

    const retailSales = sales.filter(isRetailSale);
    const outOfStock = products.filter((p) => p.total_stock === 0).length;
    const customerCount = customersRes.error ? 0 : (customersRes.count ?? 0);
    const expiringList = expiringBatches.map(batchToDashboardRow);

    const monthlySales = MONTHS.map((month, i) => {
      const total = retailSales
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
    const todaySales = retailSales.filter(
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

    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    const monthRetailTotal = retailSales
      .filter((s) => s.created_at && new Date(s.created_at) >= startOfMonth)
      .reduce((sum, s) => sum + Number(s.total_amount), 0);
    const totalProfit = monthRetailTotal * 0.35;

    return {
      customerCount,
      totalSales: retailSales.length,
      totalProfit,
      outOfStock,
      expiringList,
      monthlySales,
      todayBreakdown,
      todayTotal,
      formattedProfit: formatCurrency(totalProfit),
    };
  } catch (e) {
    console.error("getDashboardData:", e);
    return emptyDashboardData();
  }
});
