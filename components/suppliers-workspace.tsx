"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { Supplier } from "@/lib/types";
import {
  Card,
  EmptyState,
  buttonClass,
  inputClass,
  labelClass,
} from "@/components/ui";

type SupplierFormProps = {
  mode: "create" | "edit";
  editing?: Supplier | null;
  onSaved: (supplier: Supplier, message: string, mode: "create" | "edit") => void;
  onError: (message: string) => void;
};

function SupplierForm({ mode, editing, onSaved, onError }: SupplierFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    if (mode === "edit" && editing?.id) payload.id = editing.id;

    try {
      const res = await fetch("/api/suppliers", {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        supplier?: Supplier;
      };

      if (!res.ok) {
        const msg = data.error ?? "Could not save supplier";
        setError(msg);
        onError(msg);
        return;
      }

      if (mode === "create") form.reset();
      if (data.supplier) {
        onSaved(data.supplier, data.message ?? "Saved", mode);
      }
    } catch (err) {
      const msg = (err as Error).message || "Could not save supplier";
      setError(msg);
      onError(msg);
    } finally {
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
        key={mode === "edit" ? editing?.id : "create"}
        onSubmit={handleSubmit}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {mode === "edit" && editing && (
          <input type="hidden" name="id" value={editing.id} />
        )}
        <div>
          <label className={labelClass} htmlFor={`${mode}_company_name`}>
            Company name <span className="text-red-500">*</span>
          </label>
          <input
            id={`${mode}_company_name`}
            name="company_name"
            required
            defaultValue={editing?.company_name ?? ""}
            placeholder={mode === "create" ? "MediSupply PH" : undefined}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${mode}_contact_person`}>
            Contact person
          </label>
          <input
            id={`${mode}_contact_person`}
            name="contact_person"
            defaultValue={editing?.contact_person ?? ""}
            placeholder={mode === "create" ? "Ana Reyes" : undefined}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${mode}_phone`}>
            Phone
          </label>
          <input
            id={`${mode}_phone`}
            name="phone"
            defaultValue={editing?.phone ?? ""}
            placeholder={mode === "create" ? "0917-555-1001" : undefined}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${mode}_email`}>
            Email
          </label>
          <input
            id={`${mode}_email`}
            name="email"
            type="email"
            defaultValue={editing?.email ?? ""}
            placeholder={mode === "create" ? "orders@medisupply.ph" : undefined}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor={`${mode}_address`}>
            Address
          </label>
          <input
            id={`${mode}_address`}
            name="address"
            defaultValue={editing?.address ?? ""}
            placeholder={mode === "create" ? "Quezon City" : undefined}
            className={inputClass}
          />
        </div>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
          <button type="submit" disabled={loading} className={buttonClass}>
            {loading
              ? "Saving…"
              : mode === "edit"
                ? "Save changes"
                : "Add supplier"}
          </button>
          {mode === "edit" && (
            <Link
              href="/suppliers"
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

export function SuppliersWorkspace({
  initialSuppliers,
  isAdmin,
  initialEditing,
  initialSuccess,
  initialError,
}: {
  initialSuppliers: Supplier[];
  isAdmin: boolean;
  initialEditing: Supplier | null;
  initialSuccess?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [editing, setEditing] = useState(initialEditing);
  const [success, setSuccess] = useState(initialSuccess ?? "");
  const [error, setError] = useState(initialError ?? "");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setSuppliers(initialSuppliers);
  }, [initialSuppliers]);

  useEffect(() => {
    setEditing(initialEditing);
  }, [initialEditing]);

  function handleSaved(
    supplier: Supplier,
    message: string,
    mode: "create" | "edit"
  ) {
    setSuccess(message);
    setError("");
    if (mode === "create") {
      setSuppliers((prev) => [supplier, ...prev]);
    } else {
      setSuppliers((prev) =>
        prev.map((s) => (s.id === supplier.id ? supplier : s))
      );
      setEditing(null);
      window.history.replaceState(null, "", "/suppliers");
    }
    startTransition(() => router.refresh());
  }

  async function handleDelete(supplier: Supplier) {
    if (
      !window.confirm(
        `Delete ${supplier.company_name}? This cannot be undone.`
      )
    ) {
      return;
    }

    setError("");
    setDeletingId(supplier.id);
    const prev = suppliers;
    setSuppliers((list) => list.filter((s) => s.id !== supplier.id));
    setSuccess("Supplier deleted");

    try {
      const res = await fetch(`/api/suppliers?id=${supplier.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSuppliers(prev);
        setSuccess("");
        setError(data.error ?? "Could not delete supplier");
        return;
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setSuppliers(prev);
      setSuccess("");
      setError((err as Error).message || "Could not delete supplier");
    } finally {
      setDeletingId(null);
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

      {!isAdmin && (
        <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          View-only mode. Contact an admin to add or edit suppliers.
        </p>
      )}

      {isAdmin && editing && (
        <Card title="Edit supplier" className="mb-6">
          <SupplierForm
            mode="edit"
            editing={editing}
            onSaved={handleSaved}
            onError={setError}
          />
        </Card>
      )}

      {isAdmin && !editing && (
        <Card title="Add supplier" className="mb-6">
          <SupplierForm mode="create" onSaved={handleSaved} onError={setError} />
        </Card>
      )}

      <Card title={`Suppliers (${suppliers.length})`}>
        {suppliers.length === 0 ? (
          <EmptyState message="No suppliers yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-medium">Company</th>
                  <th className="pb-2 font-medium">Contact</th>
                  <th className="pb-2 font-medium">Phone</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Address</th>
                  {isAdmin && <th className="pb-2 font-medium" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 font-medium text-slate-700">
                      {s.company_name}
                    </td>
                    <td className="py-3">{s.contact_person ?? "—"}</td>
                    <td className="py-3">{s.phone ?? "—"}</td>
                    <td className="py-3">{s.email ?? "—"}</td>
                    <td className="py-3 text-slate-500">{s.address ?? "—"}</td>
                    {isAdmin && (
                      <td className="py-3 text-right whitespace-nowrap">
                        <Link
                          href={`/suppliers?edit=${s.id}`}
                          className="mr-3 text-xs font-medium text-blue-600 hover:underline"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === s.id}
                          onClick={() => handleDelete(s)}
                          className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
                        >
                          {deletingId === s.id ? "Deleting…" : "Delete"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
