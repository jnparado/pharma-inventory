import Link from "next/link";
import { DownloadPanel } from "@/components/download-panel";
import { isSupabaseConfigured } from "@/lib/data";
import { getSalesMetrics } from "@/lib/sales-metrics";
import { displayReceiptNumber } from "@/lib/receipt";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  SetupNotice,
  StatCard,
} from "@/components/ui";



export default async function ReportsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Sales Report" />
        <SetupNotice />
      </>
    );
  }

  const { summary, sales: allSales } = await getSalesMetrics();
  const sales = allSales.slice(0, 50);

  return (
    <>
      <PageHeader
        title="Sales Report"
        description="Revenue summaries, recent transactions, top products, and downloadable exports."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Today"
          value={formatCurrency(summary.today_total)}
          tone="success"
        />
        <StatCard label="Today (sales)" value={summary.today_count} />
        <StatCard
          label="This week"
          value={formatCurrency(summary.week_total)}
        />
        <StatCard
          label="This month"
          value={formatCurrency(summary.month_total)}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Top selling products">
          {summary.top_products.length === 0 ? (
            <EmptyState message="No sales data yet. Use POS to record sales." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="pb-2">Product</th>
                  <th className="pb-2">Qty sold</th>
                  <th className="pb-2">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.top_products.map((p) => (
                  <tr key={p.sku}>
                    <td className="py-2 font-medium">{p.product_name}</td>
                    <td className="py-2">{p.qty_sold}</td>
                    <td className="py-2">{formatCurrency(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Summary">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Sales this week</dt>
              <dd className="font-medium">{summary.week_count}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Sales this month</dt>
              <dd className="font-medium">{summary.month_count}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3">
              <dt className="font-medium text-slate-700">All-time revenue</dt>
              <dd className="font-semibold text-blue-700">
                {formatCurrency(summary.all_time_total)}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card title="Recent sales" className="mt-6">
        {sales.length === 0 ? (
          <EmptyState message="No sales recorded yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="pb-2">Receipt</th>
                  <th className="pb-2">Invoice</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Items</th>
                  <th className="pb-2">Payment</th>
                  <th className="pb-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="py-3">
                      <Link
                        href={`/receipt/${sale.id}`}
                        className="font-mono text-xs font-medium text-blue-600 hover:underline"
                      >
                        {displayReceiptNumber(sale)}
                      </Link>
                    </td>
                    <td className="py-3 font-mono text-xs text-slate-500">
                      {sale.invoice_number}
                    </td>
                    <td className="py-3 text-slate-500">
                      {sale.created_at
                        ? formatDateTime(sale.created_at)
                        : "—"}
                    </td>
                    <td className="py-3">
                      {(sale.sale_items ?? [])
                        .map(
                          (i) =>
                            `${i.products?.product_name ?? "?"} ×${i.quantity}`
                        )
                        .join(", ") || "—"}
                    </td>
                    <td className="py-3">
                      <Badge>{sale.payment_method ?? "cash"}</Badge>
                    </td>
                    <td className="py-3 font-semibold">
                      {formatCurrency(sale.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Download reports" className="mt-6">
        <DownloadPanel />
      </Card>
    </>
  );
}
