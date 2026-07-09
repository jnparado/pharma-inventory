"use client";

import type { SaleWithItems } from "@/lib/types";
import { displayReceiptNumber } from "@/lib/receipt";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export function ReceiptView({
  sale,
  showActions = true,
}: {
  sale: SaleWithItems;
  showActions?: boolean;
}) {
  const receiptNo = displayReceiptNumber(sale);
  const items = sale.sale_items ?? [];

  return (
    <div className="mx-auto max-w-md">
      <div
        id="receipt-print"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none"
      >
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400 text-sm font-black text-white">
            Rx
          </div>
          <h1 className="text-lg font-bold text-slate-900">PharmaStock</h1>
          <p className="text-xs text-slate-500">Official Receipt</p>
        </div>

        <div className="my-4 border-y border-dashed border-slate-200 py-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Receipt No.</span>
            <span className="font-mono font-semibold text-slate-800">{receiptNo}</span>
          </div>
          <div className="mt-1 flex justify-between gap-4">
            <span className="text-slate-500">Invoice No.</span>
            <span className="font-mono text-xs text-slate-600">{sale.invoice_number}</span>
          </div>
          <div className="mt-1 flex justify-between gap-4">
            <span className="text-slate-500">Date</span>
            <span className="text-slate-700">
              {sale.created_at ? formatDateTime(sale.created_at) : "—"}
            </span>
          </div>
          <div className="mt-1 flex justify-between gap-4">
            <span className="text-slate-500">Payment</span>
            <span className="capitalize text-slate-700">
              {sale.payment_method ?? "cash"}
            </span>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 text-right font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-50">
                <td className="py-2 pr-2">
                  <p className="font-medium text-slate-800">
                    {item.products?.product_name ?? "Product"}
                  </p>
                  <p className="text-xs text-slate-400">{item.products?.sku}</p>
                </td>
                <td className="py-2 text-right text-slate-600">{item.quantity}</td>
                <td className="py-2 text-right font-medium text-slate-800">
                  {formatCurrency(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="text-sm font-semibold text-slate-700">Total</span>
          <span className="text-xl font-bold text-teal-700">
            {formatCurrency(sale.total_amount)}
          </span>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Thank you for your purchase
        </p>
      </div>

      {showActions && (
        <div className="mt-4 flex flex-wrap gap-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Print receipt
          </button>
        </div>
      )}
    </div>
  );
}
