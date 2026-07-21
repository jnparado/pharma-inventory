"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonClass, inputClass, labelClass } from "@/components/ui";

export type PoProductOption = {
  id: string;
  product_name: string;
  unit: string;
  unit_cost: number;
  quantity_on_hand: number;
  reorder_level: number;
};

export type PoSupplierOption = {
  id: string;
  company_name: string;
};

type LineDraft = {
  key: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
};

function emptyLine(): LineDraft {
  return {
    key: crypto.randomUUID(),
    product_id: "",
    quantity: 1,
    unit_cost: 0,
  };
}

export function PurchaseOrderDialog({
  suppliers,
  products,
  isAdmin,
}: {
  suppliers: PoSupplierOption[];
  products: PoProductOption[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    message: string;
    poId: string;
    poNumber: string;
    invoiceNumber?: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading]);

  function resetForm() {
    setMode("manual");
    setSupplierId(suppliers[0]?.id ?? "");
    setNotes("");
    setLines([emptyLine()]);
    setError("");
    setSuccess(null);
  }

  function openDialog() {
    resetForm();
    setOpen(true);
  }

  function closeDialog() {
    if (loading) return;
    setOpen(false);
  }

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );
  }

  function onProductChange(key: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    updateLine(key, {
      product_id: productId,
      unit_cost: product?.unit_cost ?? 0,
      quantity: Math.max(1, (product?.reorder_level ?? 10) - (product?.quantity_on_hand ?? 0)),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(null);

    try {
      const payload =
        mode === "auto"
          ? {
              mode: "auto" as const,
              supplier_id: supplierId || null,
            }
          : {
              mode: "manual" as const,
              supplier_id: supplierId || null,
              notes: notes.trim() || null,
              items: lines
                .filter((line) => line.product_id)
                .map((line) => ({
                  product_id: line.product_id,
                  quantity: line.quantity,
                  unit_cost: line.unit_cost,
                })),
            };

      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        id?: string;
        po_number?: string;
        invoice_number?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Could not create purchase order");
        return;
      }

      setSuccess({
        message: data.message ?? "Purchase order created",
        poId: data.id ?? "",
        poNumber: data.po_number ?? "",
        invoiceNumber: data.invoice_number,
      });
      router.refresh();
    } catch (err) {
      setError((err as Error).message || "Could not create purchase order");
    } finally {
      setLoading(false);
    }
  }

  if (!isAdmin) {
    return (
      <p className="text-sm text-slate-500">
        Admin access is required to create purchase orders.
      </p>
    );
  }

  return (
    <>
      <button type="button" onClick={openDialog} className={buttonClass}>
        Generate PO
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="po-dialog-title"
          onClick={closeDialog}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="po-dialog-title" className="text-lg font-semibold text-slate-900">
                  Create purchase order
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Fill in supplier and line items, or auto-generate for low-stock products.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                disabled={loading}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {success ? (
              <div className="space-y-4 px-5 py-6">
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  {success.message}
                  {success.invoiceNumber && (
                    <p className="mt-2 font-mono text-xs text-blue-900">
                      Sales Invoice: {success.invoiceNumber}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/orders/${success.poId}`}
                    className={buttonClass}
                    onClick={() => setOpen(false)}
                  >
                    View &amp; print PO
                  </Link>
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
                <div className="flex gap-2 rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setMode("manual")}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                      mode === "manual"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600"
                    }`}
                  >
                    Manual PO
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("auto")}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                      mode === "auto"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600"
                    }`}
                  >
                    Auto reorder
                  </button>
                </div>

                <div>
                  <label className={labelClass} htmlFor="po-supplier">
                    Supplier
                  </label>
                  <select
                    id="po-supplier"
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select supplier…</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.company_name}
                      </option>
                    ))}
                  </select>
                  {suppliers.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      No suppliers yet. Add one under Purchase → Suppliers.
                    </p>
                  )}
                </div>

                {mode === "manual" ? (
                  <>
                    <div>
                      <label className={labelClass} htmlFor="po-notes">
                        Notes / delivery instructions
                      </label>
                      <textarea
                        id="po-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        placeholder="Expected delivery date, special instructions…"
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-700">Line items</p>
                        <button
                          type="button"
                          onClick={() => setLines((prev) => [...prev, emptyLine()])}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          + Add line
                        </button>
                      </div>

                      {lines.map((line, index) => (
                        <div
                          key={line.key}
                          className="grid gap-3 rounded-lg border border-slate-100 p-3 sm:grid-cols-12"
                        >
                          <div className="sm:col-span-5">
                            <label className="text-xs text-slate-500">Product</label>
                            <select
                              required={index === 0}
                              value={line.product_id}
                              onChange={(e) => onProductChange(line.key, e.target.value)}
                              className={inputClass}
                            >
                              <option value="">Select product…</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.product_name} (stock: {p.quantity_on_hand})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-xs text-slate-500">Qty</label>
                            <input
                              type="number"
                              min={1}
                              required={Boolean(line.product_id)}
                              value={line.quantity}
                              onChange={(e) =>
                                updateLine(line.key, {
                                  quantity: Number(e.target.value),
                                })
                              }
                              className={inputClass}
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <label className="text-xs text-slate-500">Unit cost (₱)</label>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              required={Boolean(line.product_id)}
                              value={line.unit_cost}
                              onChange={(e) =>
                                updateLine(line.key, {
                                  unit_cost: Number(e.target.value),
                                })
                              }
                              className={inputClass}
                            />
                          </div>
                          <div className="flex items-end sm:col-span-2">
                            {lines.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setLines((prev) =>
                                    prev.filter((row) => row.key !== line.key)
                                  )
                                }
                                className="text-sm text-red-500 hover:underline"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Creates one PO for all products at or below their reorder level.
                    Suggested quantities are calculated automatically. You can print the
                    PO after it is created.
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={closeDialog}
                    disabled={loading}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || (mode === "manual" && products.length === 0)}
                    className={`${buttonClass} disabled:opacity-60`}
                  >
                    {loading
                      ? "Creating…"
                      : mode === "auto"
                        ? "Generate PO"
                        : "Create PO"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
