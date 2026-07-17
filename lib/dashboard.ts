import { createAdminClient } from "@/lib/supabase/admin";
import {
  getProductInventoryLines,
  getProductsWithStock,
} from "@/lib/data";
import { getSalesMetrics } from "@/lib/sales-metrics";
import { formatCurrency, expiryStatus } from "@/lib/utils";
import type { DashboardInventoryRow } from "@/lib/types";

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

function toDashboardRow(line: Awaited<
  ReturnType<typeof getProductInventoryLines>
>[number]): DashboardInventoryRow {
  return {
    id: line.batch_id,
    product_name: line.product_name,
    supplier: line.supplier_name,
    quantity: line.quantity,
    expiry_date: line.expiry_date,
    lot_number: line.lot_number,
    selling_price_ws: line.selling_price_ws,
    selling_price_retail: line.selling_price_retail,
  };
}

function emptyDashboardData() {
  return {
    customerCount: 0,
    totalSales: 0,
    totalProfit: 0,
    outOfStock: 0,
    expiringList: [] as DashboardInventoryRow[],
    maxExpiringQty: 1,
    recentOrders: [] as DashboardInventoryRow[],
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

export async function getDashboardData() {
  try {
    const supabase = createAdminClient();
    const [products, metrics, inventory, customersRes] = await Promise.all([
      getProductsWithStock(),
      getSalesMetrics(),
      getProductInventoryLines(),
      supabase.from("customers").select("id", { count: "exact", head: true }),
    ]);

    const sales = metrics.sales;
    const summary = metrics.summary;
    const outOfStock = products.filter((p) => p.total_stock === 0).length;
    const customerCount = customersRes.error ? 0 : (customersRes.count ?? 0);

    const expiringList = inventory
      .filter(
        (line) =>
          line.quantity > 0 &&
          line.expiry_date &&
          expiryStatus(line.expiry_date) !== "ok"
      )
      .sort((a, b) =>
        (a.expiry_date ?? "") < (b.expiry_date ?? "") ? -1 : 1
      )
      .slice(0, 6)
      .map(toDashboardRow);

    const maxExpiringQty = Math.max(
      ...expiringList.map((row) => row.quantity),
      1
    );

    const recentOrders = inventory.slice(0, 6).map(toDashboardRow);

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
  } catch (e) {
    console.error("getDashboardData:", e);
    return emptyDashboardData();
  }
}
