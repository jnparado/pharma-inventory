import { getBatches, isSupabaseConfigured } from "@/lib/data";
import {
  daysUntil,
  expiryStatus,
  formatCurrency,
  formatDate,
  suggestedDiscount,
} from "@/lib/utils";
import type { BatchWithProduct } from "@/lib/types";
import {
  Card,
  EmptyState,
  ExpiryBadge,
  PageHeader,
  SetupNotice,
  StatCard,
} from "@/components/ui";

export const dynamic = "force-dynamic";

function BatchTable({
  batches,
  showDiscount,
}: {
  batches: BatchWithProduct[];
  showDiscount?: boolean;
}) {
  if (batches.length === 0) {
    return <EmptyState message="Nothing in this bucket." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="pb-2 font-medium">Product</th>
            <th className="pb-2 font-medium">Batch</th>
            <th className="pb-2 font-medium">Supplier</th>
            <th className="pb-2 font-medium">Qty</th>
            <th className="pb-2 font-medium">Expiry</th>
            <th className="pb-2 font-medium">Status</th>
            {showDiscount && (
              <th className="pb-2 font-medium">Suggested price</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {batches.map((b) => {
            const discount = suggestedDiscount(b.expiry_date!);
            const price = b.products?.selling_price ?? 0;
            return (
              <tr key={b.id}>
                <td className="py-3 font-medium text-slate-700">
                  {b.products?.product_name ?? "—"}
                </td>
                <td className="py-3 font-mono text-xs text-slate-500">
                  {b.batch_number}
                </td>
                <td className="py-3 text-slate-500">
                  {b.suppliers?.company_name ?? "—"}
                </td>
                <td className="py-3">
                  {b.quantity_remaining ?? 0} {b.products?.unit ?? ""}
                </td>
                <td className="py-3 whitespace-nowrap">
                  {formatDate(b.expiry_date!)}
                  <span className="ml-1 text-xs text-slate-400">
                    ({daysUntil(b.expiry_date!)}d)
                  </span>
                </td>
                <td className="py-3">
                  <ExpiryBadge expiryDate={b.expiry_date!} />
                </td>
                {showDiscount && (
                  <td className="py-3 whitespace-nowrap">
                    {discount > 0 && price > 0 ? (
                      <>
                        <span className="font-medium text-teal-700">
                          {formatCurrency(price * (1 - discount / 100))}
                        </span>
                        <span className="ml-1.5 text-xs text-slate-400 line-through">
                          {formatCurrency(price)}
                        </span>
                        <span className="ml-1.5 text-xs font-medium text-amber-600">
                          −{discount}%
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function ExpiryPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Expiry Monitor" />
        <SetupNotice />
      </>
    );
  }

  const batches = (await getBatches()).filter(
    (b) => (b.quantity_remaining ?? 0) > 0 && b.expiry_date !== null
  );
  const expired = batches.filter(
    (b) => expiryStatus(b.expiry_date!) === "expired"
  );
  const expiring30 = batches.filter(
    (b) => expiryStatus(b.expiry_date!) === "expiring-30"
  );
  const expiring90 = batches.filter(
    (b) => expiryStatus(b.expiry_date!) === "expiring-90"
  );

  const valueAtRisk = [...expired, ...expiring30].reduce(
    (sum, b) => sum + (b.quantity_remaining ?? 0) * (b.purchase_price ?? 0),
    0
  );

  return (
    <>
      <PageHeader
        title="Expiry Monitor"
        description="Batches grouped by expiry window. Near-expiry items include a suggested discount so they sell before they're wasted."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Already expired"
          value={expired.length}
          tone={expired.length > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Expiring in 30 days"
          value={expiring30.length}
          tone={expiring30.length > 0 ? "danger" : "success"}
        />
        <StatCard
          label="Expiring in 90 days"
          value={expiring90.length}
          tone={expiring90.length > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Value at risk (cost)"
          value={formatCurrency(valueAtRisk)}
          tone={valueAtRisk > 0 ? "warning" : "success"}
        />
      </div>

      <div className="mt-6 space-y-6">
        <Card title={`Already expired (${expired.length}) — remove from shelves`}>
          <BatchTable batches={expired} />
        </Card>
        <Card
          title={`Expiring within 30 days (${expiring30.length}) — suggested 50% off`}
        >
          <BatchTable batches={expiring30} showDiscount />
        </Card>
        <Card
          title={`Expiring within 90 days (${expiring90.length}) — suggested 20% off`}
        >
          <BatchTable batches={expiring90} showDiscount />
        </Card>
      </div>
    </>
  );
}
