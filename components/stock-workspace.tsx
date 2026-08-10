"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { Product, Supplier, TransactionWithProduct } from "@/lib/types";
import { formatDateTime, formatUnitPieces } from "@/lib/utils";
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
  initialProducts: Product[];
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

  const selectedInProduct =
    initialProducts.find((p) => p.id === inProductId) ?? null;
  const selectedOutProduct =
    initialProducts.find((p) => p.id === outProductId) ?? null;

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
                Supplier
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
                Reference no.
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
                className={buttonClass}
              >
                {stockInLoading ? "Receiving…" : "Receive stock"}
              </button>
            </div>
          </form>
        </Card>

        <Card title="Sales">
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await submitStock(
                "out",
                e.currentTarget,
                setStockOutLoading
              );
              if (ok) setOutProductId("");
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
                onChange={(e) => setOutProductId(e.target.value)}
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
                  required
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
                  key={outProductId}
                  name="unit_price"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={selectedOutProduct?.selling_price ?? ""}
                  placeholder="0.00"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-400">
                  With a price, the dispense is recorded as a sale.
                </p>
              </div>
              <div>
                <label className={labelClass} htmlFor="out-ref">
                  Reference no.
                </label>
                <input
                  id="out-ref"
                  name="reference_no"
                  placeholder="Invoice / Rx #567"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                disabled={stockOutLoading}
                className={buttonClass}
              >
                {stockOutLoading ? "Dispensing…" : "Dispense stock (FIFO)"}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              First In, First Out — oldest stock is dispensed first. Expired
              batches are skipped automatically.
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
