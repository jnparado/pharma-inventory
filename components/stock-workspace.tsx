"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { UomSelect } from "@/components/uom-select";
import type {
  ProductWithStock,
  Supplier,
  TransactionWithProduct,
} from "@/lib/types";
import {
  formatCurrency,
  formatDateTime,
  formatProductUom,
  normalizeProductUom,
} from "@/lib/utils";
import {
  Badge,
  Card,
  buttonClass,
  inputClass,
  labelClass,
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
  const [inUom, setInUom] = useState("pcs");
  const [outUom, setOutUom] = useState("pcs");
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
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold text-slate-900">Purchase / Sales</h1>
      <p className="mt-1 text-sm text-slate-500">
        Pick Purchase or Sales, fill in the form, then save.
      </p>

      <div
        className="mt-6 grid grid-cols-2 gap-2"
        role="tablist"
        aria-label="Purchase or sales"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "purchase"}
          onClick={() => setMode("purchase")}
          className={`rounded-lg py-3 text-sm font-semibold transition-colors ${
            mode === "purchase"
              ? "bg-teal-600 text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Purchase
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "sales"}
          onClick={() => setMode("sales")}
          className={`rounded-lg py-3 text-sm font-semibold transition-colors ${
            mode === "sales"
              ? "bg-teal-600 text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Sales
        </button>
      </div>

      {success && (
        <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          {success}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="mt-4">
        {mode === "purchase" ? (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await submitStock(
                "in",
                e.currentTarget,
                setStockInLoading
              );
              if (ok) {
                setInProductId("");
                setInUom("pcs");
              }
            }}
          >
            <div>
              <label className={labelClass} htmlFor="in-product">
                Product
              </label>
              <select
                id="in-product"
                name="product_id"
                required
                className={inputClass}
                value={inProductId}
                onChange={(e) => {
                  const id = e.target.value;
                  setInProductId(id);
                  const product = initialProducts.find((p) => p.id === id);
                  setInUom(normalizeProductUom(product?.unit) ?? "pcs");
                }}
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
            <div className="grid gap-4 sm:grid-cols-2">
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
                  placeholder="How many?"
                  className={inputClass}
                />
              </div>
              <UomSelect
                id="in-uom"
                required
                value={inUom}
                onChange={setInUom}
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
            <details className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium text-slate-600">
                More options
              </summary>
              <div className="mt-3 space-y-4 pb-1">
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
                    Reference
                  </label>
                  <input
                    id="in-ref"
                    name="reference_no"
                    placeholder="PO or invoice number"
                    className={inputClass}
                  />
                </div>
              </div>
            </details>
            <button
              type="submit"
              disabled={stockInLoading}
              className={`${buttonClass} w-full`}
            >
              {stockInLoading ? "Saving…" : "Save purchase"}
            </button>
          </form>
        ) : (
          <form
            className="space-y-4"
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
                setOutUom("pcs");
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
                  const id = e.target.value;
                  setOutProductId(id);
                  const product = initialProducts.find((p) => p.id === id);
                  setOutUom(normalizeProductUom(product?.unit) ?? "pcs");
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
                  placeholder="How many?"
                  className={inputClass}
                />
              </div>
              <UomSelect
                id="out-uom"
                required
                value={outUom}
                onChange={setOutUom}
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
            </div>
            {saleTotal > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-teal-100 bg-teal-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-700">Total</span>
                <span className="text-xl font-semibold text-teal-700">
                  {formatCurrency(saleTotal)}
                </span>
              </div>
            )}
            <details className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium text-slate-600">
                More options
              </summary>
              <div className="mt-3 pb-1">
                <label className={labelClass} htmlFor="out-ref">
                  Reference
                </label>
                <input
                  id="out-ref"
                  name="reference_no"
                  placeholder="Invoice or Rx number"
                  className={inputClass}
                />
                <p className="mt-2 text-xs text-slate-400">
                  Price 0 = remove stock only (damaged/expired).
                </p>
              </div>
            </details>
            <button
              type="submit"
              disabled={
                stockOutLoading ||
                (selectedOutProduct?.total_stock ?? 0) === 0
              }
              className={`${buttonClass} w-full`}
            >
              {stockOutLoading ? "Saving…" : "Save sale"}
            </button>
          </form>
        )}
      </Card>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-800">Recent activity</h2>
        {transactions.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Nothing recorded yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {transactions.slice(0, 12).map((t) => {
              const isIn = t.transaction_type.toLowerCase().includes("in");
              return (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">
                      {t.products?.product_name ?? "—"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t.created_at ? formatDateTime(t.created_at) : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={isIn ? "success" : "info"}>
                      {isIn ? "Purchase" : "Sale"}
                    </Badge>
                    <span className="tabular-nums font-medium text-slate-700">
                      {isIn ? "+" : "−"}
                      {t.quantity}
                      {t.products?.unit
                        ? ` ${formatProductUom(t.products.unit)}`
                        : ""}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
