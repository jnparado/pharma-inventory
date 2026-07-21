"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ProductEntryForm } from "@/components/product-entry-form";
import { ProductInventoryTable } from "@/components/product-inventory-table";
import type { ProductInventoryLine, Supplier } from "@/lib/types";
import { Card, EmptyState } from "@/components/ui";

export function ProductsWorkspace({
  initialLines,
  suppliers,
  today,
  isAdmin,
  initialEditing,
  initialSuccess,
  initialError,
}: {
  initialLines: ProductInventoryLine[];
  suppliers: Supplier[];
  today: string;
  isAdmin: boolean;
  initialEditing: ProductInventoryLine | null;
  initialSuccess?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [lines, setLines] = useState(initialLines);
  const [editing, setEditing] = useState(initialEditing);
  const [success, setSuccess] = useState(initialSuccess ?? "");
  const [error, setError] = useState(initialError ?? "");

  useEffect(() => {
    setLines(initialLines);
  }, [initialLines]);

  useEffect(() => {
    setEditing(initialEditing);
  }, [initialEditing]);

  function supplierName(supplierId: string | null): string | null {
    if (!supplierId) return null;
    return suppliers.find((s) => s.id === supplierId)?.company_name ?? null;
  }

  function enrichLine(line: ProductInventoryLine): ProductInventoryLine {
    return {
      ...line,
      supplier_name: line.supplier_name ?? supplierName(line.supplier_id),
    };
  }

  function handleSaved(
    line: ProductInventoryLine,
    message: string,
    mode: "create" | "edit"
  ) {
    const row = enrichLine(line);
    setSuccess(message);
    setError("");

    if (mode === "create") {
      setLines((prev) => [row, ...prev.filter((l) => l.batch_id !== row.batch_id)]);
    } else {
      setLines((prev) =>
        prev.map((l) => (l.batch_id === row.batch_id ? row : l))
      );
      setEditing(null);
      window.history.replaceState(null, "", "/products");
    }

    startTransition(() => router.refresh());
  }

  function handleDeleted(batchId: string, message: string) {
    setLines((prev) => prev.filter((l) => l.batch_id !== batchId));
    setSuccess(message);
    setError("");
    startTransition(() => router.refresh());
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

      {isAdmin && editing && (
        <Card title="Edit product" className="mb-6">
          <ProductEntryForm
            mode="edit"
            editing={editing}
            today={today}
            suppliers={suppliers}
            onSaved={handleSaved}
          />
        </Card>
      )}

      {isAdmin && !editing && (
        <Card title="Add product" className="mb-6">
          <ProductEntryForm
            mode="create"
            today={today}
            suppliers={suppliers}
            onSaved={handleSaved}
          />
        </Card>
      )}

      <Card title={`Product inventory (${lines.length})`}>
        {lines.length === 0 ? (
          <EmptyState message="No products yet. Add your first entry above." />
        ) : (
          <ProductInventoryTable
            lines={lines}
            isAdmin={isAdmin}
            onDeleted={handleDeleted}
            onError={setError}
          />
        )}
      </Card>

      {isAdmin && editing && (
        <p className="mt-3 text-center text-sm text-slate-500">
          <Link href="/products" className="font-medium text-blue-600 hover:underline">
            Cancel edit
          </Link>
        </p>
      )}
    </>
  );
}
