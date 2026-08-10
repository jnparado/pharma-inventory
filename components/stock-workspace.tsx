"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type {
  ProductWithStock,
  Supplier,
  TransactionWithProduct,
} from "@/lib/types";
import { formatCurrency, formatDateTime, formatUnitPieces } from "@/lib/utils";
import {
  Badge,
  Card,
  EmptyState,
  buttonClass,
  inputClass,
  labelClass,
  optionalClass,
} from "@/components/ui";

type StockMode = "purchase" | "sales";

export function StockWorkspace({
  initialProducts,
  initialSuppliers,
  initialTransactions,
  initialSuccess,
  initialError,
}: {
  initialProducts: ProductWithStock[];
  initialSuppliers: Supplier[];
  initialTransactions: TransactionWithProduct[];
  initialSuccess?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [transactions, setTransactions] = useState(initialTransactions);
  const [success, setSuccess] = useState(initialSuccess ?? "");
  const [error, setError] = useState(initialError ?? "");
  const [stockInLoading, setStockInLoading] = useState(false);
  const [stockOutLoading, setStockOutLoading] = useState(false);
  const [inProductId, setInProductId] = useState("");
  const [outProductId, setOutProductId] = useState("");
  const [outQty, setOutQty] = useState("");
  const [outPrice, setOutPrice] = useState("");
  const [mode, setMode] = useState<StockMode>("purchase");

  const selectedInProduct =
    initialProducts.find((p) => p.id === inProductId) ?? null;
  const selectedOutProduct =
    initialProducts.find((p) => p.id === outProductId) ?? null;

  const saleTotal = (Number(outQty) || 0) * (Number(outPrice) || 0);

  useEffect(() => {
    setTransactions(initialTransactions);
  }, [initialTransactions]);

  async function submitStock(
    action: "in" | "out",
    form: HTMLFormElement,
    setLoading: (v: boolean) => void
  ): Promise<boolean> {
    setError("");
    setLoading(true);
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.action = action;

    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string; message?: string };

      if (!res.ok) {
        setError(data.error ?? "Stock operation failed");
        return false;
      }

      setSuccess(data.message ?? "Done");
      form.reset();
      startTransition(() => router.refresh());
      return true;
    } catch (err) {
      setError((err as Error).message || "Stock operation failed");
      return false;
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {success && (
        <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            {mode === "purchase"
              ? "Add stock you bought from a supplier."
              : "Sell or remove stock. Oldest batches go first."}
          </p>
          <div
            className="flex rounded-lg border border-slate-200 bg-slate-50 p-1"
            role="tablist"
            aria-label="Purchase or sales"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "purchase"}
              onClick={() => setMode("purchase")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                mode === "purchase"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Purchase
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "sales"}
              onClick={() => setMode("sales")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                mode === "sales"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Sales
            </button>
          </div>
        </div>

        {mode === "purchase" ? (
          <form
            className="grid gap-5 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await submitStock(
                "in",
                e.currentTarget,
                setStockInLoading
              );
              if (ok) setInProductId("");
            }}
          >
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="in-product">
                Product
              </label>
              <select
                id="in-product"
                name="product_id"
                required
                className={inputClass}
                value={inProductId}
                onChange={(e) => setInProductId(e.target.value)}
              >
                <option value="" disabled>
                  Choose a product…
                </option>
                {initialProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.product_name} ({p.sku})
                  </option>
                ))}
              </select>
              {selectedInProduct && (
                <p className="mt-1.5 text-sm text-slate-500">
                  Pack size: {formatUnitPieces(selectedInProduct.unit)} pieces
                  per unit
                </p>
              )}
            </div>
            <div>
              <label className={labelClass} htmlFor="in-batch">
                Brand
              </label>
              <input
                id="in-batch"
                name="batch_number"
                required
                placeholder="e.g. Unilab"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="in-expiry">
                Expiry date
              </label>
              <input
                id="in-expiry"
                name="expiry_date"
                type="date"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="in-qty">
                Quantity
              </label>
              <input
                id="in-qty"
                name="quantity"
                type="number"
                min={1}
                required
                placeholder="How many units?"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="in-cost">
                Cost per unit (&#8369;)
              </label>
              <input
                id="in-cost"
                name="purchase_price"
                type="number"
                step="0.01"
                min={0}
                defaultValue={0}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="in-supplier">
                Supplier <span className={optionalClass}>optional</span>
              </label>
              <select
                id="in-supplier"
                name="supplier_id"
                className={inputClass}
                defaultValue=""
              >
                <option value="">None</option>
                {initialSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.company_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="in-ref">
                Reference <span className={optionalClass}>optional</span>
              </label>
              <input
                id="in-ref"
                name="reference_no"
                placeholder="PO or invoice number"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2 pt-1">
              <button
                type="submit"
                disabled={stockInLoading}
                className={`${buttonClass} w-full sm:w-auto`}
              >
                {stockInLoading ? "Saving…" : "Save purchase"}
              </button>
            </div>
          </form>
        ) : (
          <form
            className="grid gap-5 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await submitStock(
                "out",
                e.currentTarget,
                setStockOutLoading
              );
              if (ok) {
                setOutProductId("");
                setOutQty("");
                setOutPrice("");
              }
            }}
          >
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="out-product">
                Product
              </label>
              <select
                id="out-product"
                name="product_id"
                required
                className={inputClass}
                value={outProductId}
                onChange={(e) => {
                  setOutProductId(e.target.value);
                  const product = initialProducts.find(
                    (p) => p.id === e.target.value
                  );
                  setOutPrice(
                    product ? String(product.selling_price ?? "") : ""
                  );
                }}
              >
                <option value="" disabled>
                  Choose a product…
                </option>
                {initialProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.product_name} — {p.total_stock} in stock
                  </option>
                ))}
              </select>
              {selectedOutProduct && (
                <p
                  className={`mt-1.5 text-sm ${
                    selectedOutProduct.total_stock > 0
                      ? "text-slate-500"
                      : "text-red-600"
                  }`}
                >
                  {selectedOutProduct.total_stock > 0
                    ? `${selectedOutProduct.total_stock} available · Pack size ${formatUnitPieces(selectedOutProduct.unit)} pcs`
                    : "This product is out of stock."}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass} htmlFor="out-qty">
                Quantity
              </label>
              <input
                id="out-qty"
                name="quantity"
                type="number"
                min={1}
                max={selectedOutProduct?.total_stock || undefined}
                required
                value={outQty}
                onChange={(e) => setOutQty(e.target.value)}
                placeholder="Units to sell"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="out-price">
                Price per unit (&#8369;)
              </label>
              <input
                id="out-price"
                name="unit_price"
                type="number"
                step="0.01"
                min={0}
                value={outPrice}
                onChange={(e) => setOutPrice(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
              <p className="mt-1.5 text-xs text-slate-400">
                Use 0 to remove stock without a sale (damaged or expired).
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="out-ref">
                Reference <span className={optionalClass}>optional</span>
              </label>
              <input
                id="out-ref"
                name="reference_no"
                placeholder="Invoice or prescription number"
                className={inputClass}
              />
            </div>
            {saleTotal > 0 && (
              <div
                className="sm:col-span-2 flex items-center justify-between rounded-lg border border-teal-100 bg-teal-50/80 px-4 py-3"
              >
                <span className="text-sm font-medium text-slate-700">
                  Sale total
                </span>
                <span className="text-xl font-semibold text-teal-700">
                  {formatCurrency(saleTotal)}
                </span>
              </div>
            )}
            <div className="sm:col-span-2 pt-1">
              <button
                type="submit"
                disabled={
                  stockOutLoading ||
                  (selectedOutProduct?.total_stock ?? 0) === 0
                }
                className={`${buttonClass} w-full sm:w-auto`}
              >
                {stockOutLoading ? "Saving…" : "Save sale"}
              </button>
            </div>
          </form>
        )}
      </Card>

      <Card title="Recent activity" className="mt-6">
        {transactions.length === 0 ? (
          <EmptyState message="No transactions yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                  <th className="pb-3 pr-4">When</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Product</th>
                  <th className="pb-3 pr-4">Brand / batch</th>
                  <th className="pb-3 pr-4">Qty</th>
                  <th className="pb-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => {
                  const isIn = t.transaction_type.toLowerCase().includes("in");
                  return (
                    <tr key={t.id}>
                      <td className="py-3 pr-4 whitespace-nowrap text-slate-500">
                        {t.created_at ? formatDateTime(t.created_at) : "—"}
                      </td>
                      <td className="py-3 pr-4">
                        {isIn ? (
                          <Badge tone="success">Purchase</Badge>
                        ) : (
                          <Badge tone="info">Sale</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-medium text-slate-800">
                        {t.products?.product_name ?? "—"}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {t.product_batches?.batch_number ?? "—"}
                      </td>
                      <td className="py-3 pr-4 tabular-nums text-slate-700">
                        {isIn ? "+" : "−"}
                        {t.quantity}
                      </td>
                      <td className="py-3 text-slate-500">
                        {t.reference_no ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
