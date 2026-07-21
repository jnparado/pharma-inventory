"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { buttonClass, inputClass, labelClass } from "@/components/ui";
import type { ProductInventoryLine, Supplier } from "@/lib/types";
import { normalizeProductUom, PRODUCT_UOM_OPTIONS } from "@/lib/utils";

type ProductEntry = {
  entry_date: string | null;
  product_name: string;
  brand: string | null;
  unit: string | null;
  supplier_id: string | null;
  rack_location: string | null;
  quantity: number;
  lot_number: string;
  expiry_date: string | null;
  cost: number | null;
  selling_price_ws: number | null;
  selling_price_retail: number;
  batch_id?: string;
  product_id?: string;
};

function ProductFields({
  editing,
  today,
  suppliers,
}: {
  editing?: ProductEntry | null;
  today: string;
  suppliers: Supplier[];
}) {
  return (
    <>
      <div>
        <label className={labelClass} htmlFor="entry_date">
          Date <span className="text-red-500">*</span>
        </label>
        <input
          id="entry_date"
          name="entry_date"
          type="date"
          required
          defaultValue={editing?.entry_date ?? today}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="product_name">
          Product name <span className="text-red-500">*</span>
        </label>
        <input
          id="product_name"
          name="product_name"
          required
          defaultValue={editing?.product_name ?? ""}
          placeholder="Amoxicillin 500mg"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="brand">
          Brand <span className="text-red-500">*</span>
        </label>
        <input
          id="brand"
          name="brand"
          required
          defaultValue={editing?.brand ?? ""}
          placeholder="Unilab"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="unit">
          Unit of Measure (UOM) <span className="text-red-500">*</span>
        </label>
        <select
          id="unit"
          name="unit"
          required
          defaultValue={normalizeProductUom(editing?.unit) ?? "PCS"}
          className={inputClass}
        >
          <option value="" disabled>
            Select UOM…
          </option>
          {PRODUCT_UOM_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor="supplier_id">
          Supplier
        </label>
        <select
          id="supplier_id"
          name="supplier_id"
          defaultValue={editing?.supplier_id ?? ""}
          className={inputClass}
        >
          <option value="">Select supplier…</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.company_name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor="rack_location">
          Rack / location
        </label>
        <input
          id="rack_location"
          name="rack_location"
          defaultValue={editing?.rack_location ?? ""}
          placeholder="A-12, Shelf 3"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="quantity">
          Quantity <span className="text-red-500">*</span>
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          min={1}
          step={1}
          required
          defaultValue={editing?.quantity ?? ""}
          placeholder="100"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="lot_number">
          Lot number <span className="text-red-500">*</span>
        </label>
        <input
          id="lot_number"
          name="lot_number"
          required
          defaultValue={editing?.lot_number ?? ""}
          placeholder="LOT-2026-001"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="expiry_date">
          Exp date
        </label>
        <input
          id="expiry_date"
          name="expiry_date"
          type="date"
          defaultValue={editing?.expiry_date ?? ""}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="cost">
          Cost (&#8369;) <span className="text-red-500">*</span>
        </label>
        <input
          id="cost"
          name="cost"
          type="number"
          step="0.01"
          min={0}
          required
          defaultValue={editing?.cost ?? ""}
          placeholder="0.00"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="selling_price_ws">
          Selling price WS (&#8369;) <span className="text-red-500">*</span>
        </label>
        <input
          id="selling_price_ws"
          name="selling_price_ws"
          type="number"
          step="0.01"
          min={0}
          required
          defaultValue={editing?.selling_price_ws ?? ""}
          placeholder="0.00"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="selling_price_retail">
          Selling price retail (&#8369;) <span className="text-red-500">*</span>
        </label>
        <input
          id="selling_price_retail"
          name="selling_price_retail"
          type="number"
          step="0.01"
          min={0}
          required
          defaultValue={editing?.selling_price_retail ?? ""}
          placeholder="0.00"
          className={inputClass}
        />
      </div>
    </>
  );
}

function InventoryUpload({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/products/import", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        imported?: number;
      };

      if (!res.ok) {
        setError(data.error ?? "Import failed");
        return;
      }

      setMessage(data.message ?? `Imported ${data.imported ?? 0} products`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message || "Import failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 sm:col-span-3">
      <p className="mb-2 text-sm font-medium text-slate-700">
        Upload inventory (CSV)
      </p>
      <p className="mb-3 text-xs text-slate-500">
        Columns: product_name, brand, quantity, lot_number, expiry_date, cost,
        selling_price_ws, selling_price_retail, unit, supplier_id, rack_location,
        entry_date
      </p>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        disabled={disabled || uploading}
        onChange={handleUpload}
        className="block w-full max-w-md text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-teal-700"
      />
      {uploading && (
        <p className="mt-2 text-sm text-slate-500">Uploading…</p>
      )}
      {message && (
        <p className="mt-2 text-sm text-teal-700">{message}</p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function ProductEntryForm({
  mode,
  editing,
  today,
  suppliers,
  onSaved,
}: {
  mode: "create" | "edit";
  editing?: ProductEntry | null;
  today: string;
  suppliers: Supplier[];
  onSaved?: (
    line: ProductInventoryLine,
    message: string,
    mode: "create" | "edit"
  ) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    if (mode === "edit" && editing?.batch_id && editing?.product_id) {
      payload.batch_id = editing.batch_id;
      payload.product_id = editing.product_id;
    }

    const supplierId = String(payload.supplier_id ?? "");
    const supplierLabel =
      suppliers.find((s) => s.id === supplierId)?.company_name ?? null;
    if (supplierLabel) payload.supplier_name = supplierLabel;

    try {
      const res = await fetch("/api/products", {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        error?: string;
        message?: string;
        line?: ProductInventoryLine | null;
      };

      if (!res.ok) {
        setError(data.error ?? "Could not save product");
        setLoading(false);
        return;
      }

      if (mode === "create") {
        form.reset();
        const dateInput = form.querySelector<HTMLInputElement>("#entry_date");
        if (dateInput) dateInput.value = today;
        const expiryInput = form.querySelector<HTMLInputElement>("#expiry_date");
        if (expiryInput) expiryInput.value = "";
        const unitInput = form.querySelector<HTMLSelectElement>("#unit");
        if (unitInput) unitInput.value = "PCS";
      }

      const message = data.message ?? "Saved";
      if (data.line && onSaved) {
        onSaved(data.line, message, mode);
      } else if (mode === "edit") {
        router.replace("/products");
        router.refresh();
      }

      setLoading(false);
    } catch (err) {
      setError((err as Error).message || "Could not save product");
      setLoading(false);
    }
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        key={mode === "edit" ? editing?.batch_id : "create"}
        onSubmit={handleSubmit}
        className="grid gap-4 sm:grid-cols-3"
      >
        <ProductFields editing={editing} today={today} suppliers={suppliers} />
        {mode === "create" && <InventoryUpload disabled={loading} />}
        <div className="flex flex-wrap gap-2 sm:col-span-3">
          <button
            type="submit"
            disabled={loading}
            className={`${buttonClass} disabled:opacity-60`}
          >
            {loading
              ? "Saving…"
              : mode === "edit"
                ? "Save changes"
                : "Add product"}
          </button>
          {mode === "edit" && (
            <Link
              href="/products"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
          )}
        </div>
      </form>
    </>
  );
}
