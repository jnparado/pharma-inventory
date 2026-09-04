"use client";

import Link from "next/link";
import type { PurchaseOrder } from "@/lib/types";
import { formatCurrency, formatDateTime, formatProductUom } from "@/lib/utils";

export function PurchaseOrderView({
  order,
  showActions = true,
}: {
  order: PurchaseOrder & {
    suppliers?: {
      company_name?: string;
      contact_person?: string | null;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
    } | null;
    notes?: string | null;
  };
  showActions?: boolean;
}) {
  const items = order.purchase_order_items ?? [];
  const lineTotal = items.reduce(
    (sum, item) => sum + item.quantity * Number(item.unit_cost ?? 0),
    0
  );
  const supplier = order.suppliers;

  return (
    <div className="mx-auto max-w-2xl">
      <div
        id="po-print"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-sm font-black text-white">
              PO
            </div>
            <h1 className="text-xl font-bold text-slate-900">Purchase Order</h1>
            <p className="text-sm text-slate-500">PharmaStock Inventory</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono text-lg font-bold text-slate-900">
              {order.po_number}
            </p>
            <p className="mt-1 capitalize text-slate-500">
              Status: {order.status ?? "pending"}
            </p>
            <p className="text-slate-500">
              {order.created_at ? formatDateTime(order.created_at) : "—"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Supplier
            </p>
            <p className="mt-1 font-semibold text-slate-800">
              {supplier?.company_name ?? "—"}
            </p>
            {supplier?.contact_person && (
              <p className="text-slate-600">{supplier.contact_person}</p>
            )}
            {supplier?.phone && <p className="text-slate-600">{supplier.phone}</p>}
            {supplier?.email && <p className="text-slate-600">{supplier.email}</p>}
            {supplier?.address && (
              <p className="mt-1 whitespace-pre-wrap text-slate-600">
                {supplier.address}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Order details
            </p>
            <p className="mt-1 text-slate-600">
              Items: <span className="font-medium text-slate-800">{items.length}</span>
            </p>
            <p className="text-slate-600">
              Total cost:{" "}
              <span className="font-medium text-slate-800">
                {formatCurrency(lineTotal)}
              </span>
            </p>
            {order.notes && (
              <p className="mt-2 whitespace-pre-wrap text-slate-600">
                <span className="font-medium text-slate-700">Notes: </span>
                {order.notes}
              </p>
            )}
          </div>
        </div>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
              <th className="pb-2 font-medium">Product</th>
              <th className="pb-2 text-right font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Unit cost</th>
              <th className="pb-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const subtotal = item.quantity * Number(item.unit_cost ?? 0);
              return (
                <tr key={item.id} className="border-b border-slate-50">
                  <td className="py-3 pr-2">
                    <p className="font-medium text-slate-800">
                      {item.products?.product_name ?? "—"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatProductUom(item.products?.unit ?? null)} / unit
                    </p>
                  </td>
                  <td className="py-3 text-right text-slate-700">{item.quantity}</td>
                  <td className="py-3 text-right text-slate-700">
                    {formatCurrency(item.unit_cost ?? 0)}
                  </td>
                  <td className="py-3 text-right font-medium text-slate-800">
                    {formatCurrency(subtotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-4 text-right text-sm font-semibold text-slate-700">
                Total
              </td>
              <td className="pt-4 text-right text-lg font-bold text-teal-700">
                {formatCurrency(lineTotal)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-8 grid gap-8 sm:grid-cols-2 print:mt-12">
          <div>
            <p className="border-t border-slate-300 pt-2 text-xs text-slate-500">
              Prepared by
            </p>
          </div>
          <div>
            <p className="border-t border-slate-300 pt-2 text-xs text-slate-500">
              Authorized signature
            </p>
          </div>
        </div>
      </div>

      {showActions && (
        <div className="mt-4 flex flex-wrap gap-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Print purchase order
          </button>
          <Link
            href="/orders"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to orders
          </Link>
        </div>
      )}
    </div>
  );
}
