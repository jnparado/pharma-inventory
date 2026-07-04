import { generatePurchaseOrders, updateOrderStatus } from "@/app/actions";
import { getPurchaseOrders, isSupabaseConfigured } from "@/lib/data";
import type { PurchaseOrder } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  Badge,
  Card,
  EmptyState,
  FlashMessage,
  PageHeader,
  SetupNotice,
  buttonClass,
} from "@/components/ui";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Automated Supplier Ordering" />
        <SetupNotice />
      </>
    );
  }

  const orders = (await getPurchaseOrders()) as PurchaseOrder[];

  return (
    <>
      <PageHeader
        title="Automated Supplier Ordering"
        description="Auto-generates purchase orders when stock is low. Review, approve, and track deliveries."
      />
      <FlashMessage success={success} error={error} />

      <Card title="Auto reorder">
        <p className="mb-4 text-sm text-slate-600">
          Creates a purchase order for all products at or below their reorder
          level. Assigns your first supplier if available.
        </p>
        <form action={generatePurchaseOrders}>
          <button type="submit" className={buttonClass}>
            Generate purchase orders
          </button>
        </form>
      </Card>

      <Card title={`Purchase orders (${orders.length})`} className="mt-6">
        {orders.length === 0 ? (
          <EmptyState message="No purchase orders yet. Click generate when stock runs low." />
        ) : (
          <div className="space-y-6">
            {orders.map((po) => (
              <div
                key={po.id}
                className="rounded-lg border border-slate-100 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">{po.po_number}</p>
                    <p className="text-sm text-slate-500">
                      {po.suppliers?.company_name ?? "No supplier"} ·{" "}
                      {po.created_at ? formatDateTime(po.created_at) : "—"}
                    </p>
                  </div>
                  <Badge
                    tone={
                      po.status === "approved"
                        ? "success"
                        : po.status === "pending"
                          ? "warning"
                          : "default"
                    }
                  >
                    {po.status ?? "draft"}
                  </Badge>
                </div>

                {po.purchase_order_items && po.purchase_order_items.length > 0 && (
                  <table className="mt-3 w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400">
                        <th className="pb-1">Product</th>
                        <th className="pb-1">Qty</th>
                        <th className="pb-1">Unit cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {po.purchase_order_items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-1">
                            {item.products?.product_name ?? "—"}
                          </td>
                          <td className="py-1">
                            {item.quantity} {item.products?.unit ?? ""}
                          </td>
                          <td className="py-1">
                            {formatCurrency(item.unit_cost ?? 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {po.status === "pending" && (
                  <div className="mt-3 flex gap-3">
                    <form action={updateOrderStatus}>
                      <input type="hidden" name="id" value={po.id} />
                      <input type="hidden" name="status" value="approved" />
                      <button
                        type="submit"
                        className="text-sm font-medium text-teal-600 hover:underline"
                      >
                        Approve order
                      </button>
                    </form>
                    <form action={updateOrderStatus}>
                      <input type="hidden" name="id" value={po.id} />
                      <input type="hidden" name="status" value="delivered" />
                      <button
                        type="submit"
                        className="text-sm font-medium text-slate-500 hover:underline"
                      >
                        Mark delivered
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
