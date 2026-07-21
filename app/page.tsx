import Link from "next/link";
import { DashboardCharts } from "@/components/dashboard-charts";
import { KpiCard } from "@/components/kpi-card";
import { SetupNotice, TableScroll } from "@/components/ui";
import { Badge } from "@/components/ui";
import { getDashboardData } from "@/lib/dashboard";
import { isSupabaseConfigured } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

  const tableHeaders = (
    <>
      <th className="pb-3 font-medium">Product name</th>
      <th className="pb-3 font-medium">Supplier</th>
      <th className="pb-3 font-medium">Qty</th>
      <th className="pb-3 font-medium">Exp. Date</th>
      <th className="pb-3 font-medium">WS Price</th>
      <th className="pb-3 font-medium">Retail Price</th>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Customer"
          value={data.customerCount}
          tone="blue"
          href="/customers"
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
            <span className="text-lg font-bold leading-none">₱</span>
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
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800 sm:text-base">
              Expiring List
            </h3>
            <Link
              href="/expiry"
              className="shrink-0 text-xs font-medium text-teal-600 hover:underline"
            >
              See All
            </Link>
          </div>
          <TableScroll>
            <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                {tableHeaders}
              </tr>
            </thead>
            <tbody>
              {data.expiringList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No expiring batches
                  </td>
                </tr>
              ) : (
                data.expiringList.map((row) => (
                  <tr key={row.id} className="border-t border-slate-50">
                    <td className="py-3 font-medium text-slate-700">
                      {row.product_name}
                    </td>
                    <td className="py-3 text-slate-500">
                      {row.supplier ?? "—"}
                    </td>
                    <td className="py-3">{row.quantity}</td>
                    <td className="py-3 text-slate-500">
                      {row.expiry_date ? formatDate(row.expiry_date) : "—"}
                    </td>
                    <td className="py-3">
                      {row.selling_price_ws != null
                        ? formatCurrency(row.selling_price_ws)
                        : "—"}
                    </td>
                    <td className="py-3">
                      {formatCurrency(row.selling_price_retail)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </TableScroll>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800 sm:text-base">
              Recent Orders
            </h3>
            <Link
              href="/orders"
              className="shrink-0 text-xs font-medium text-teal-600 hover:underline"
            >
              See All
            </Link>
          </div>
          <TableScroll>
            <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="pb-3 font-medium">PO number</th>
                <th className="pb-3 font-medium">Supplier</th>
                <th className="pb-3 font-medium">Items</th>
                <th className="pb-3 font-medium">Total</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No purchase orders yet
                  </td>
                </tr>
              ) : (
                data.recentOrders.map((row) => (
                  <tr key={row.id} className="border-t border-slate-50">
                    <td className="py-3 font-medium text-slate-700">
                      <Link
                        href={`/orders/${row.id}`}
                        className="hover:text-teal-600 hover:underline"
                      >
                        {row.po_number}
                      </Link>
                    </td>
                    <td className="py-3 text-slate-500">
                      {row.supplier ?? "—"}
                    </td>
                    <td className="py-3">{row.items_count}</td>
                    <td className="py-3">{formatCurrency(row.total)}</td>
                    <td className="py-3">
                      <Badge
                        tone={
                          row.status === "received"
                            ? "success"
                            : row.status === "cancelled"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {row.status ?? "pending"}
                      </Badge>
                    </td>
                    <td className="py-3 text-slate-500">
                      {row.created_at ? formatDate(row.created_at) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </TableScroll>
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
