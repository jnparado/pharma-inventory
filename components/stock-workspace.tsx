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
} from "@/components/ui";

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
        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Purchase">
          <p className="mb-4 text-sm text-slate-500">
            Add stock you received from a supplier.
          </p>
          <form
            className="grid gap-4 sm:grid-cols-2"
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
                  Select a product…
                </option>
                {initialProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.product_name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="in-supplier">
                Supplier <span className="text-slate-400">(optional)</span>
              </label>
              <select
                id="in-supplier"
                name="supplier_id"
                className={inputClass}
                defaultValue=""
              >
                <option value="">No supplier</option>
                {initialSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.company_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="in-batch">
                Brand
              </label>
              <input
                id="in-batch"
                name="batch_number"
                required
                placeholder="Unilab"
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
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="in-uom">
                UOM (pieces per unit)
              </label>
              <input
                id="in-uom"
                value={
                  selectedInProduct
                    ? `${formatUnitPieces(selectedInProduct.unit)} pcs`
                    : ""
                }
                readOnly
                placeholder="Select a product"
                className={`${inputClass} bg-slate-50 text-slate-500`}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="in-cost">
                Purchase price (per unit)
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
              <label className={labelClass} htmlFor="in-ref">
                Reference no. <span className="text-slate-400">(optional)</span>
              </label>
              <input
                id="in-ref"
                name="reference_no"
                placeholder="PO #1234"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={stockInLoading}
                className={`${buttonClass} w-full sm:w-auto`}
              >
                {stockInLoading ? "Saving…" : "Record purchase"}
              </button>
            </div>
          </form>
        </Card>

        <Card title="Sales">
          <p className="mb-4 text-sm text-slate-500">
            Record a sale — stock is deducted automatically, oldest first.
          </p>
          <form
            className="grid gap-4"
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
            <div>
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
                  Select a product…
                </option>
                {initialProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.product_name} ({p.sku}) — {p.total_stock} in stock
                  </option>
                ))}
              </select>
              {selectedOutProduct && (
                <p
                  className={`mt-1 text-xs ${
                    selectedOutProduct.total_stock > 0
                      ? "text-slate-400"
                      : "text-red-500"
                  }`}
                >
                  {selectedOutProduct.total_stock > 0
                    ? `${selectedOutProduct.total_stock} available`
                    : "Out of stock"}
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="out-uom">
                  UOM (pieces per unit)
                </label>
                <input
                  id="out-uom"
                  value={
                    selectedOutProduct
                      ? `${formatUnitPieces(selectedOutProduct.unit)} pcs`
                      : ""
                  }
                  readOnly
                  placeholder="Select a product"
                  className={`${inputClass} bg-slate-50 text-slate-500`}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="out-price">
                  Price (&#8369; per unit)
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
              </div>
              <div>
                <label className={labelClass} htmlFor="out-ref">
                  Reference no. <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  id="out-ref"
                  name="reference_no"
                  placeholder="Invoice / Rx #567"
                  className={inputClass}
                />
              </div>
            </div>
            {saleTotal > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-600">Total</span>
                <span className="text-lg font-bold text-teal-700">
                  {formatCurrency(saleTotal)}
                </span>
              </div>
            )}
            <div>
              <button
                type="submit"
                disabled={stockOutLoading}
                className={`${buttonClass} w-full sm:w-auto`}
              >
                {stockOutLoading ? "Saving…" : "Record sale"}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Leave the price at 0 to remove stock without recording a sale
              (e.g. damaged or expired items). Expired stock is never sold.
            </p>
          </form>
        </Card>
      </div>

      <Card title="Purchase & sales history" className="mt-6">
        {transactions.length === 0 ? (
          <EmptyState message="No transactions yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Batch</th>
                  <th className="pb-2 font-medium">Qty</th>
                  <th className="pb-2 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => {
                  const isIn = t.transaction_type.toLowerCase().includes("in");
                  return (
                    <tr key={t.id}>
                      <td className="py-3 whitespace-nowrap text-slate-500">
                        {t.created_at ? formatDateTime(t.created_at) : "—"}
                      </td>
                      <td className="py-3">
                        {isIn ? (
                          <Badge tone="success">Stock in</Badge>
                        ) : (
                          <Badge tone="info">Stock out</Badge>
                        )}
                      </td>
                      <td className="py-3 font-medium text-slate-700">
                        {t.products?.product_name ?? "—"}
                      </td>
                      <td className="py-3 font-mono text-xs text-slate-500">
                        {t.product_batches?.batch_number ?? "—"}
                      </td>
                      <td className="py-3">
                        {isIn ? "+" : "−"}
                        {t.quantity} {t.products?.unit ?? ""}
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
