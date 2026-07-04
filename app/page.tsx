import Link from "next/link";
import {
  getBatches,
  getProductsWithStock,
  isSupabaseConfigured,
} from "@/lib/data";
import { daysUntil, expiryStatus, formatDate } from "@/lib/utils";
import {
  Badge,
  Card,
  EmptyState,
  ExpiryBadge,
  PageHeader,
  SetupNotice,
  StatCard,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <SetupNotice />
      </>
    );
  }

  const [products, batches] = await Promise.all([
    getProductsWithStock(),
    getBatches(),
  ]);

  const lowStock = products.filter(
    (p) => p.total_stock > 0 && p.total_stock <= (p.reorder_level ?? 0)
  );
  const outOfStock = products.filter((p) => p.total_stock === 0);
  const activeBatches = batches.filter(
    (b) => (b.quantity_remaining ?? 0) > 0 && b.expiry_date !== null
  );
  const expired = activeBatches.filter(
    (b) => expiryStatus(b.expiry_date!) === "expired"
  );
  const expiring30 = activeBatches.filter(
    (b) => expiryStatus(b.expiry_date!) === "expiring-30"
  );
  const expiring90 = activeBatches.filter(
    (b) => expiryStatus(b.expiry_date!) === "expiring-90"
  );
  const totalUnits = batches.reduce(
    (sum, b) => sum + (b.quantity_remaining ?? 0),
    0
  );

  const attentionBatches = [...expired, ...expiring30, ...expiring90].slice(
    0,
    8
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Stock levels, low-stock alerts, and expiry status at a glance."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Products" value={products.length} />
        <StatCard label="Units in stock" value={totalUnits.toLocaleString()} />
        <StatCard
          label="Low / out of stock"
          value={lowStock.length + outOfStock.length}
          tone={lowStock.length + outOfStock.length > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Expiring in 30 days"
          value={expiring30.length}
          tone={expiring30.length > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Expired batches"
          value={expired.length}
          tone={expired.length > 0 ? "danger" : "success"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Low-stock alerts">
          {lowStock.length + outOfStock.length === 0 ? (
            <EmptyState message="All products are above their reorder level." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Stock</th>
                  <th className="pb-2 font-medium">Reorder at</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...outOfStock, ...lowStock].map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 font-medium text-slate-700">
                      {p.product_name}
                    </td>
                    <td className="py-2.5">
                      {p.total_stock} {p.unit ?? "pcs"}
                    </td>
                    <td className="py-2.5 text-slate-500">
                      {p.reorder_level ?? 0}
                    </td>
                    <td className="py-2.5">
                      {p.total_stock === 0 ? (
                        <Badge tone="danger">Out of stock</Badge>
                      ) : (
                        <Badge tone="warning">Low stock</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt-3 text-right">
            <Link
              href="/stock"
              className="text-sm font-medium text-teal-600 hover:underline"
            >
              Receive stock &rarr;
            </Link>
          </div>
        </Card>

        <Card title="Batches needing attention">
          {attentionBatches.length === 0 ? (
            <EmptyState message="No batches are expired or expiring within 90 days." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Batch</th>
                  <th className="pb-2 font-medium">Expiry</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attentionBatches.map((b) => (
                  <tr key={b.id}>
                    <td className="py-2.5 font-medium text-slate-700">
                      {b.products?.product_name ?? "—"}
                    </td>
                    <td className="py-2.5 font-mono text-xs text-slate-500">
                      {b.batch_number}
                    </td>
                    <td className="py-2.5">
                      {formatDate(b.expiry_date!)}
                      <span className="ml-1 text-xs text-slate-400">
                        ({daysUntil(b.expiry_date!)}d)
                      </span>
                    </td>
                    <td className="py-2.5">
                      <ExpiryBadge expiryDate={b.expiry_date!} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt-3 text-right">
            <Link
              href="/expiry"
              className="text-sm font-medium text-teal-600 hover:underline"
            >
              Open expiry monitor &rarr;
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
