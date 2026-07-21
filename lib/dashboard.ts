import { createAdminClient } from "@/lib/supabase/admin";
import {
  getProductInventoryLines,
  getProductsWithStock,
  getPurchaseOrders,
} from "@/lib/data";
import { getSalesMetrics } from "@/lib/sales-metrics";
import { formatCurrency, expiryStatus } from "@/lib/utils";
import type { DashboardInventoryRow, SaleWithItems } from "@/lib/types";

export type DashboardOrderRow = {
  id: string;
  po_number: string;
  supplier: string | null;
  status: string | null;
  items_count: number;
  total: number;
  created_at: string | null;
};

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

/**
 * Month-to-date profit from actual sale items: revenue minus batch/product
 * cost. Items with no recorded cost fall back to an assumed 35% margin.
 */
async function computeMonthProfit(
  supabase: ReturnType<typeof createAdminClient>,
  sales: SaleWithItems[]
): Promise<number> {
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );
  const items = sales
    .filter((s) => s.created_at && new Date(s.created_at) >= startOfMonth)
    .flatMap((s) => s.sale_items ?? []);
  if (items.length === 0) return 0;

  const batchIds = [
    ...new Set(items.map((i) => i.batch_id).filter((id): id is string => !!id)),
  ];
  const productIds = [
    ...new Set(
      items.map((i) => i.product_id).filter((id): id is string => !!id)
    ),
  ];

  const costByBatch = new Map<string, number>();
  if (batchIds.length > 0) {
    const { data } = await supabase
      .from("product_batches")
      .select("id, purchase_price")
      .in("id", batchIds);
    for (const row of data ?? []) {
      if (row.purchase_price != null) {
        costByBatch.set(String(row.id), Number(row.purchase_price));
      }
    }
  }

  const costByProduct = new Map<string, number>();
  if (productIds.length > 0) {
    for (const select of ["id, cost, purchase_price", "id, purchase_price", "id, cost"] as const) {
      const { data, error } = await supabase
        .from("products")
        .select(select)
        .in("id", productIds);
      if (error) continue;
      for (const raw of (data ?? []) as unknown as Record<string, unknown>[]) {
        const cost = raw.cost ?? raw.purchase_price;
        if (cost != null) costByProduct.set(String(raw.id), Number(cost));
      }
      break;
    }
  }

  let profit = 0;
  for (const item of items) {
    const revenue =
      Number(item.subtotal) || item.quantity * Number(item.unit_price);
    const unitCost =
      (item.batch_id ? costByBatch.get(item.batch_id) : undefined) ??
      (item.product_id ? costByProduct.get(item.product_id) : undefined) ??
      Number(item.unit_price) * 0.65;
    profit += revenue - item.quantity * unitCost;
  }
  return profit;
}

function toOrderRow(
  po: Awaited<ReturnType<typeof getPurchaseOrders>>[number]
): DashboardOrderRow {
  const orderItems = po.purchase_order_items ?? [];
  return {
    id: po.id,
    po_number: po.po_number,
    supplier: po.suppliers?.company_name ?? null,
    status: po.status,
    items_count: orderItems.length,
    total: orderItems.reduce(
      (sum, item) => sum + item.quantity * Number(item.unit_cost ?? 0),
      0
    ),
    created_at: po.created_at,
  };
}

function emptyDashboardData() {
  return {
    customerCount: 0,
    totalSales: 0,
    totalProfit: 0,
    outOfStock: 0,
    expiringList: [] as DashboardInventoryRow[],
    recentOrders: [] as DashboardOrderRow[],
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
    const [products, metrics, inventory, customersRes, purchaseOrders] =
      await Promise.all([
        getProductsWithStock(),
        getSalesMetrics(),
        getProductInventoryLines(),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        getPurchaseOrders().catch(() => []),
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

    const recentOrders = purchaseOrders.slice(0, 6).map(toOrderRow);

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

    const totalProfit = await computeMonthProfit(supabase, sales).catch(
      () => summary.month_total * 0.35
    );

    return {
      customerCount,
      totalSales: sales.length,
      totalProfit,
      outOfStock,
      expiringList,
      recentOrders,
      monthlySales,
      todayBreakdown,
      todayTotal,
      formattedProfit: formatCurrency(totalProfit),
    };
  } catch (e) {
    console.error("getDashboardData:", e);
    return emptyDashboardData();
  }
}
