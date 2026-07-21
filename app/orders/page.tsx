import Link from "next/link";
import {
  PurchaseOrderDialog,
  type PoProductOption,
} from "@/components/purchase-order-dialog";
import { OrderStatusActions } from "@/components/order-status-actions";
import {
  getProductInventoryLines,
  getPurchaseOrders,
  getSuppliers,
  isSupabaseConfigured,
} from "@/lib/data";
import { getSalesInvoicesForPurchaseOrders } from "@/lib/purchase-order-invoice";
import { canManageRecords } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveUser } from "@/lib/user-session";
import type { PurchaseOrder } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  Badge,
  Card,
  EmptyState,
  FlashMessage,
  PageHeader,
  SetupNotice,
  TableScroll,
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
        <PageHeader title="Purchase Orders" />
        <SetupNotice />
      </>
    );
  }

  const [orders, suppliers, inventory, activeUser] = await Promise.all([
    getPurchaseOrders() as Promise<PurchaseOrder[]>,
    getSuppliers(),
    getProductInventoryLines(),
    getActiveUser(),
  ]);

  const isAdmin = canManageRecords(activeUser);

  const poProducts: PoProductOption[] = inventory.map((line) => ({
    id: line.product_id,
    product_name: line.product_name,
    unit: line.unit ?? "PCS",
    unit_cost:
      line.cost && line.cost > 0
        ? line.cost
        : Math.round(line.selling_price_retail * 0.6 * 100) / 100,
    quantity_on_hand: line.quantity,
    reorder_level: 10,
  }));

  const supabase = createAdminClient();
  let invoiceMap = new Map<
    string,
    {
      invoice_number: string;
      receipt_number: string | null;
      total_amount: number;
      sale_id: string;
    }
  >();
  try {
    invoiceMap = await getSalesInvoicesForPurchaseOrders(
      supabase,
      orders.map((po) => po.po_number)
    );
  } catch {
    invoiceMap = new Map();
  }

  return (
    <>
      <PageHeader
        title="Purchase Orders"
        description="Create POs for suppliers — each PO automatically becomes a Sales Invoice and adds stock to inventory."
      />
      <FlashMessage success={success} error={error} />

      <Card title="Create purchase order">
        <p className="mb-4 text-sm text-slate-600">
          Click <strong>Generate PO</strong> to pick a supplier, add products, or
          auto-reorder low-stock items. Saving creates the PO, generates a Sales
          Invoice, and adds quantities to inventory automatically.
        </p>
        <PurchaseOrderDialog
          suppliers={suppliers.map((s) => ({
            id: s.id,
            company_name: s.company_name,
          }))}
          products={poProducts}
          isAdmin={isAdmin}
        />
      </Card>

      <Card title={`Purchase orders (${orders.length})`} className="mt-6">
        {orders.length === 0 ? (
          <EmptyState message="No purchase orders yet. Click Generate PO to create one." />
        ) : (
          <div className="space-y-6">
            {orders.map((po) => {
              const invoice = invoiceMap.get(po.po_number);
              const lineTotal =
                po.purchase_order_items?.reduce(
                  (sum, item) =>
                    sum + item.quantity * Number(item.unit_cost ?? 0),
                  0
                ) ?? 0;

              return (
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
                      {invoice && (
                        <p className="mt-1 text-sm">
                          <span className="text-slate-500">Sales Invoice: </span>
                          <span className="font-mono font-medium text-slate-700">
                            {invoice.invoice_number}
                          </span>
                          <span className="ml-2 text-slate-500">
                            ({formatCurrency(invoice.total_amount)})
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/orders/${po.id}`}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        View &amp; print
                      </Link>
                      <Badge
                        tone={
                          po.status === "approved" || po.status === "delivered"
                            ? "success"
                            : po.status === "pending"
                              ? "warning"
                              : "default"
                        }
                      >
                        {po.status ?? "draft"}
                      </Badge>
                    </div>
                  </div>

                  {po.purchase_order_items && po.purchase_order_items.length > 0 && (
                    <TableScroll>
                      <table className="mt-3 w-full min-w-[420px] text-sm">
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
                        <tfoot>
                          <tr>
                            <td colSpan={2} className="pt-2 text-right text-xs text-slate-500">
                              PO total (cost)
                            </td>
                            <td className="pt-2 font-medium text-slate-700">
                              {formatCurrency(lineTotal)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </TableScroll>
                  )}

                  {isAdmin && (
                    <OrderStatusActions
                      orderId={po.id}
                      status={po.status ?? "pending"}
                      hasInvoice={Boolean(invoice)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}
