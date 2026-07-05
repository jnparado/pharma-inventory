import Link from "next/link";
import { DashboardCharts, Sparkline } from "@/components/dashboard-charts";
import { KpiCard } from "@/components/kpi-card";
import { SetupNotice } from "@/components/ui";
import { getDashboardData } from "@/lib/dashboard";
import { isSupabaseConfigured } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const orderStatusTone: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-indigo-100 text-indigo-700",
  delivered: "bg-sky-100 text-sky-700",
  cancelled: "bg-red-100 text-red-700",
};

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-6">
        <h1 className="mb-4 text-2xl font-bold text-slate-800">Dashboard</h1>
        <SetupNotice />
      </div>
    );
  }

  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label="Total Customer"
          value={data.customerCount}
          tone="blue"
          href="/prescriptions"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <KpiCard
          label="Total Sales"
          value={data.totalSales}
          tone="green"
          href="/reports"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <KpiCard
          label="Total Profit"
          value={data.formattedProfit}
          tone="yellow"
          href="/reports"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <KpiCard
          label="Out of Stock"
          value={data.outOfStock}
          tone="red"
          href="/products"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">
              Expiring List
            </h3>
            <Link
              href="/expiry"
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              See All
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="pb-3 font-medium">Medicine name</th>
                <th className="pb-3 font-medium">Expire Date</th>
                <th className="pb-3 font-medium">Quantity</th>
                <th className="pb-3 font-medium">Chart</th>
              </tr>
            </thead>
            <tbody>
              {data.expiringList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No expiring batches
                  </td>
                </tr>
              ) : (
                data.expiringList.map((b) => (
                  <tr key={b.id} className="border-t border-slate-50">
                    <td className="py-3 font-medium text-slate-700">
                      {b.products?.product_name ?? "—"}
                    </td>
                    <td className="py-3 text-slate-500">
                      {b.expiry_date ? formatDate(b.expiry_date) : "—"}
                    </td>
                    <td className="py-3">{b.quantity_remaining ?? 0}</td>
                    <td className="py-3">
                      <Sparkline
                        value={b.quantity_remaining ?? 0}
                        max={data.maxExpiringQty}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800">
              Recent Orders
            </h3>
            <Link
              href="/orders"
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              See All
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="pb-3 font-medium">Medicine name</th>
                <th className="pb-3 font-medium">Batch No</th>
                <th className="pb-3 font-medium">Quantity</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No purchase orders yet
                  </td>
                </tr>
              ) : (
                data.recentOrders.map((po) => {
                  const firstItem = po.purchase_order_items?.[0];
                  const lineTotal =
                    (firstItem?.quantity ?? 0) * (firstItem?.unit_cost ?? 0);
                  const status = po.status ?? "pending";
                  return (
                    <tr key={po.id} className="border-t border-slate-50">
                      <td className="py-3 font-medium text-slate-700">
                        {firstItem?.products?.product_name ?? po.po_number}
                      </td>
                      <td className="py-3 font-mono text-xs text-slate-500">
                        {po.po_number}
                      </td>
                      <td className="py-3">{firstItem?.quantity ?? "—"}</td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${orderStatusTone[status] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-3">
                        {lineTotal > 0 ? formatCurrency(lineTotal) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DashboardCharts
        monthlyData={data.monthlySales}
        todayBreakdown={data.todayBreakdown}
        todayTotal={data.todayTotal}
      />
    </div>
  );
}
