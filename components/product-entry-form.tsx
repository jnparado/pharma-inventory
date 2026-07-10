"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass, inputClass, labelClass } from "@/components/ui";

type ProductEntry = {
  entry_date: string | null;
  product_name: string;
  brand: string | null;
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
}: {
  editing?: ProductEntry | null;
  today: string;
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

export function ProductEntryForm({
  mode,
  editing,
  today,
}: {
  mode: "create" | "edit";
  editing?: ProductEntry | null;
  today: string;
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

    try {
      const res = await fetch("/api/products", {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { error?: string; message?: string };

      if (!res.ok) {
        setError(data.error ?? "Could not save product");
        setLoading(false);
        return;
      }

      if (mode === "create") {
        form.reset();
        const dateInput = form.querySelector<HTMLInputElement>("#entry_date");
        if (dateInput) dateInput.value = today;
      }

      router.replace(
        `/products?success=${encodeURIComponent(data.message ?? "Saved")}`
      );
      router.refresh();
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

      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
        <ProductFields editing={editing} today={today} />
        <div className={`flex flex-wrap gap-2 ${mode === "edit" ? "sm:col-span-3" : "sm:col-span-3"}`}>
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
