import Link from "next/link";
import { generatePurchaseOrders, updateOrderStatus } from "@/app/actions";
import { getPurchaseOrders, isSupabaseConfigured } from "@/lib/data";
import { getSalesInvoicesForPurchaseOrders } from "@/lib/purchase-order-invoice";
import { displayReceiptNumber } from "@/lib/receipt";
import { createAdminClient } from "@/lib/supabase/admin";
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
        title="Automated Supplier Ordering"
        description="Approve purchase orders to generate a Sales Invoice, convert to Receipt (OR), and deduct inventory."
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
                        <div className="mt-1 space-y-0.5 text-sm">
                          <p>
                            <span className="text-slate-500">Sales Invoice: </span>
                            <span className="font-mono font-medium text-slate-700">
                              {invoice.invoice_number}
                            </span>
                            <span className="ml-2 text-slate-500">
                              ({formatCurrency(invoice.total_amount)})
                            </span>
                          </p>
                          <p>
                            <span className="text-slate-500">Receipt: </span>
                            <Link
                              href={`/receipt/${invoice.sale_id}`}
                              className="font-mono font-medium text-teal-600 hover:underline"
                            >
                              {displayReceiptNumber({
                                invoice_number: invoice.invoice_number,
                                receipt_number: invoice.receipt_number,
                              })}
                            </Link>
                          </p>
                        </div>
                      )}
                    </div>
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

                  {po.status === "pending" && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      <form action={updateOrderStatus}>
                        <input type="hidden" name="id" value={po.id} />
                        <input type="hidden" name="status" value="approved" />
                        <button type="submit" className={buttonClass}>
                          Approve → Invoice → Receipt
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

                  {po.status === "approved" && !invoice && (
                    <form action={updateOrderStatus} className="mt-3">
                      <input type="hidden" name="id" value={po.id} />
                      <input type="hidden" name="status" value="approved" />
                      <button
                        type="submit"
                        className="text-sm font-medium text-teal-600 hover:underline"
                      >
                        Generate Sales Invoice
                      </button>
                    </form>
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
