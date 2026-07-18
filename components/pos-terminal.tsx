"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ProductWithStock } from "@/lib/types";
import { formatCurrency, stockQuantityLabel } from "@/lib/utils";
import { Badge, Card, buttonClass, inputClass, labelClass } from "@/components/ui";

type CartLine = {
  product_id: string;
  product_name: string;
  sku: string;
  unit: string | null;
  unit_price: number;
  quantity: number;
  max_stock: number;
};

export function PosTerminal({ products }: { products: ProductWithStock[] }) {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<{
    saleId: string;
    invoice: string;
    receiptNo: string;
    total: number;
    change: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products.filter((p) => p.total_stock > 0).slice(0, 12);
    return products
      .filter(
        (p) =>
          p.total_stock > 0 &&
          (p.product_name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.barcode?.toLowerCase().includes(q) ||
            p.generic_name?.toLowerCase().includes(q))
      )
      .slice(0, 12);
  }, [products, search]);

  const subtotal = cart.reduce(
    (sum, line) => sum + line.quantity * line.unit_price,
    0
  );
  const paidNum = Number(amountPaid) || 0;
  const change =
    paymentMethod === "cash" && paidNum > 0 ? Math.max(0, paidNum - subtotal) : 0;

  function addToCart(product: ProductWithStock) {
    setReceipt(null);
    setError(null);
    setCart((prev) => {
      const existing = prev.find((l) => l.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.total_stock) return prev;
        return prev.map((l) =>
          l.product_id === product.id
            ? { ...l, quantity: l.quantity + 1 }
            : l
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.product_name,
          sku: product.sku,
          unit: product.unit,
          unit_price: product.selling_price,
          quantity: 1,
          max_stock: product.total_stock,
        },
      ];
    });
  }

  function updateQty(productId: string, qty: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product_id === productId
            ? { ...l, quantity: Math.min(Math.max(1, qty), l.max_stock) }
            : l
        )
        .filter((l) => l.quantity > 0)
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.product_id !== productId));
  }

  async function checkout() {
    if (cart.length === 0) return;
    if (paymentMethod === "cash" && paidNum < subtotal) {
      setError("Amount paid is less than total");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((l) => ({
            product_id: l.product_id,
            quantity: l.quantity,
            unit_price: l.unit_price,
          })),
          payment_method: paymentMethod,
          amount_paid: paymentMethod === "cash" ? paidNum : subtotal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReceipt({
        saleId: data.sale_id,
        invoice: data.invoice_number,
        receiptNo: data.receipt_number,
        total: data.total,
        change: data.change,
      });
      setCart([]);
      setAmountPaid("");
      setSearch("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-5">
      <div className="order-2 space-y-4 lg:order-1 lg:col-span-3">
        <Card title="Find product">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, SKU, or barcode…"
            className={inputClass}
            autoFocus
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addToCart(p)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-colors hover:border-teal-300 hover:bg-teal-50"
              >
                <p className="text-sm font-medium text-slate-800">
                  {p.product_name}
                </p>
                <p className="text-xs text-slate-500">
                  {p.sku} · {p.total_stock} {stockQuantityLabel()} ·{" "}
                  {formatCurrency(p.selling_price)}
                </p>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-2 py-4 text-center text-sm text-slate-400">
                No products found or out of stock.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="order-1 lg:order-2 lg:col-span-2">
        <Card title={`Cart (${cart.length})`}>
          {cart.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Tap a product to add it to the cart.
            </p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {cart.map((line) => (
                <li
                  key={line.product_id}
                  className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{line.product_name}</p>
                    <p className="text-xs text-slate-500">
                      {formatCurrency(line.unit_price)} × {line.quantity}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={line.max_stock}
                    value={line.quantity}
                    onChange={(e) =>
                      updateQty(line.product_id, Number(e.target.value))
                    }
                    className="w-14 rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(line.product_id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span className="text-teal-700">{formatCurrency(subtotal)}</span>
            </div>

            <div>
              <label className={labelClass}>Payment method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className={inputClass}
              >
                <option value="cash">Cash</option>
                <option value="gcash">GCash</option>
                <option value="card">Card</option>
                <option value="maya">Maya</option>
              </select>
            </div>

            {paymentMethod === "cash" && (
              <div>
                <label className={labelClass}>Amount paid</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0.00"
                  className={inputClass}
                />
                {paidNum >= subtotal && subtotal > 0 && (
                  <p className="mt-1 text-sm text-slate-600">
                    Change: {formatCurrency(change)}
                  </p>
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            {receipt && (
              <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm">
                <Badge tone="success">Sale complete</Badge>
                <p className="mt-2 font-medium">Receipt: {receipt.receiptNo}</p>
                <p className="text-xs text-slate-500">Invoice: {receipt.invoice}</p>
                <p>Total: {formatCurrency(receipt.total)}</p>
                {receipt.change > 0 && (
                  <p>Change: {formatCurrency(receipt.change)}</p>
                )}
                <Link
                  href={`/receipt/${receipt.saleId}`}
                  className="mt-2 inline-block text-sm font-medium text-teal-700 hover:underline"
                >
                  View & print receipt →
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={checkout}
              disabled={loading || cart.length === 0}
              className={`${buttonClass} w-full disabled:opacity-50`}
            >
              {loading ? "Processing…" : "Complete sale"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
