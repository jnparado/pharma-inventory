"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProductInventoryLine } from "@/lib/types";
import { formatCurrency, formatDate, formatUnitPieces } from "@/lib/utils";

export function ProductInventoryTable({
  lines,
  isAdmin,
  onDeleted,
  onError,
}: {
  lines: ProductInventoryLine[];
  isAdmin: boolean;
  onDeleted?: (batchId: string, message: string) => void;
  onError?: (message: string) => void;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function reportError(message: string) {
    setError(message);
    onError?.(message);
  }

  async function handleDelete(line: ProductInventoryLine) {
    if (
      !window.confirm(
        `Delete ${line.product_name} (lot ${line.lot_number})? This cannot be undone.`
      )
    ) {
      return;
    }

    setError("");
    setDeletingId(line.batch_id);

    const batchId = line.batch_id;
    if (onDeleted) {
      onDeleted(batchId, "Product removed");
    }

    try {
      const params = new URLSearchParams({
        batch_id: line.batch_id,
        product_id: line.product_id,
      });
      const res = await fetch(`/api/products?${params}`, { method: "DELETE" });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        batch_id?: string;
      };

      if (!res.ok) {
        reportError(data.error ?? "Could not delete product");
        router.refresh();
        setDeletingId(null);
        return;
      }

      if (!onDeleted) {
        const message = data.message ?? "Product removed";
        router.replace(`/products?success=${encodeURIComponent(message)}`);
        router.refresh();
      }
    } catch (err) {
      reportError((err as Error).message || "Could not delete product");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="pb-2 pr-3 font-medium">Date</th>
              <th className="pb-2 pr-3 font-medium">Product name</th>
              <th className="pb-2 pr-3 font-medium">Supplier</th>
              <th className="pb-2 pr-3 font-medium">Brand</th>
              <th className="pb-2 pr-3 font-medium">Lot number</th>
              <th className="pb-2 pr-3 font-medium">Exp date</th>
              <th className="pb-2 pr-3 font-medium">Quantity</th>
              <th className="pb-2 pr-3 font-medium">UOM (pcs)</th>
              <th className="pb-2 pr-3 font-medium">Cost</th>
              <th className="pb-2 pr-3 font-medium">Selling price WS</th>
              <th className="pb-2 pr-3 font-medium">Selling price retail</th>
              <th className="pb-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((line) => (
              <tr key={line.batch_id}>
                <td className="py-3 pr-3 whitespace-nowrap text-slate-600">
                  {line.entry_date ? formatDate(line.entry_date) : "—"}
                </td>
                <td className="py-3 pr-3 font-medium text-slate-700">
                  {line.product_name}
                </td>
                <td className="py-3 pr-3 text-slate-600">
                  {line.supplier_name ?? "—"}
                </td>
                <td className="py-3 pr-3 text-slate-600">
                  {line.brand ?? "—"}
                </td>
                <td className="py-3 pr-3 font-mono text-xs text-slate-500">
                  {line.lot_number}
                </td>
                <td className="py-3 pr-3 whitespace-nowrap text-slate-600">
                  {line.expiry_date ? formatDate(line.expiry_date) : "—"}
                </td>
                <td className="py-3 pr-3">{line.quantity}</td>
                <td className="py-3 pr-3 text-slate-600">
                  {formatUnitPieces(line.unit)}
                </td>
                <td className="py-3 pr-3 whitespace-nowrap">
                  {formatCurrency(line.cost ?? 0)}
                </td>
                <td className="py-3 pr-3 whitespace-nowrap">
                  {formatCurrency(line.selling_price_ws ?? 0)}
                </td>
                <td className="py-3 pr-3 whitespace-nowrap">
                  {formatCurrency(line.selling_price_retail)}
                </td>
                <td className="py-3 text-right whitespace-nowrap">
                  {isAdmin ? (
                    <>
                      <Link
                        href={`/products?edit=${line.batch_id}`}
                        className="mr-3 text-xs font-medium text-teal-600 hover:underline"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={deletingId === line.batch_id}
                        onClick={() => handleDelete(line)}
                        className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
                      >
                        {deletingId === line.batch_id ? "Deleting…" : "Delete"}
                      </button>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
