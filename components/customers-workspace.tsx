"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { Customer } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import {
  Card,
  EmptyState,
  buttonClass,
  inputClass,
  labelClass,
} from "@/components/ui";

type CustomerFormProps = {
  mode: "create" | "edit";
  editing?: Customer | null;
  onSaved: (customer: Customer, message: string, mode: "create" | "edit") => void;
  onError: (message: string) => void;
};

function CustomerForm({ mode, editing, onSaved, onError }: CustomerFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    if (mode === "edit" && editing?.id) {
      payload.id = editing.id;
      if (editing.created_at) payload.created_at = editing.created_at;
    }

    try {
      const res = await fetch("/api/customers", {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        customer?: Customer;
      };

      if (!res.ok) {
        const msg = data.error ?? "Could not save customer";
        setError(msg);
        onError(msg);
        setLoading(false);
        return;
      }

      if (mode === "create") form.reset();
      if (data.customer) {
        onSaved(data.customer, data.message ?? "Saved", mode);
      }
    } catch (err) {
      const msg = (err as Error).message || "Could not save customer";
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
          <label className={labelClass} htmlFor={`${mode}_full_name`}>
            Full name <span className="text-red-500">*</span>
          </label>
          <input
            id={`${mode}_full_name`}
            name="full_name"
            required
            defaultValue={editing?.full_name ?? ""}
            placeholder={mode === "create" ? "Maria Santos" : undefined}
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
            placeholder={mode === "create" ? "maria@email.com" : undefined}
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
            placeholder={mode === "create" ? "0917-555-0100" : undefined}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={labelClass} htmlFor={`${mode}_address`}>
            Address
          </label>
          <input
            id={`${mode}_address`}
            name="address"
            defaultValue={editing?.address ?? ""}
            placeholder={mode === "create" ? "Manila" : undefined}
            className={inputClass}
          />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
          <button type="submit" disabled={loading} className={buttonClass}>
            {loading
              ? "Saving…"
              : mode === "edit"
                ? "Save changes"
                : "Add customer"}
          </button>
          {mode === "edit" && (
            <Link
              href="/customers"
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

export function CustomersWorkspace({
  initialCustomers,
  isAdmin,
  hasAddressColumn,
  initialEditing,
  initialSuccess,
  initialError,
}: {
  initialCustomers: Customer[];
  isAdmin: boolean;
  hasAddressColumn: boolean;
  initialEditing: Customer | null;
  initialSuccess?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [customers, setCustomers] = useState(initialCustomers);
  const [editing, setEditing] = useState(initialEditing);
  const [success, setSuccess] = useState(initialSuccess ?? "");
  const [error, setError] = useState(initialError ?? "");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setCustomers(initialCustomers);
  }, [initialCustomers]);

  useEffect(() => {
    setEditing(initialEditing);
  }, [initialEditing]);

  function handleSaved(
    customer: Customer,
    message: string,
    mode: "create" | "edit"
  ) {
    setSuccess(message);
    setError("");
    if (mode === "create") {
      setCustomers((prev) => [customer, ...prev]);
    } else {
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? customer : c))
      );
      setEditing(null);
      window.history.replaceState(null, "", "/customers");
    }
    startTransition(() => router.refresh());
  }

  async function handleDelete(customer: Customer) {
    if (
      !window.confirm(
        `Delete ${customer.full_name ?? "this customer"}? This cannot be undone.`
      )
    ) {
      return;
    }

    setError("");
    setDeletingId(customer.id);
    const prev = customers;
    setCustomers((list) => list.filter((c) => c.id !== customer.id));
    setSuccess("Customer removed");

    try {
      const res = await fetch(`/api/customers?id=${customer.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setCustomers(prev);
        setSuccess("");
        setError(data.error ?? "Could not delete customer");
        return;
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setCustomers(prev);
      setSuccess("");
      setError((err as Error).message || "Could not delete customer");
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

      {isAdmin && !hasAddressColumn && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The <code className="rounded bg-amber-100 px-1">address</code> column is
          missing in Supabase. Run{" "}
          <code className="rounded bg-amber-100 px-1">supabase/customers.sql</code>{" "}
          in the SQL Editor, then edit each customer and save their address again.
        </p>
      )}

      {!isAdmin && (
        <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          View-only mode. Contact an admin to add or edit customer records.
        </p>
      )}

      {isAdmin && editing && (
        <Card title="Edit customer" className="mb-6">
          <CustomerForm
            mode="edit"
            editing={editing}
            onSaved={handleSaved}
            onError={setError}
          />
        </Card>
      )}

      {isAdmin && !editing && (
        <Card title="Add customer" className="mb-6">
          <CustomerForm
            mode="create"
            onSaved={handleSaved}
            onError={setError}
          />
        </Card>
      )}

      <Card title={`Customers (${customers.length})`}>
        {customers.length === 0 ? (
          <EmptyState message="No customers yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Phone</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Address</th>
                  <th className="pb-2 font-medium">Registered</th>
                  {isAdmin && <th className="pb-2 font-medium" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 font-medium text-slate-700">
                      {c.full_name ?? "—"}
                    </td>
                    <td className="py-3">{c.phone ?? "—"}</td>
                    <td className="py-3">{c.email ?? "—"}</td>
                    <td className="py-3 max-w-xs whitespace-pre-wrap text-slate-500">
                      {c.address ?? "—"}
                    </td>
                    <td className="py-3 text-slate-500">
                      {c.created_at ? formatDateTime(c.created_at) : "—"}
                    </td>
                    {isAdmin && (
                      <td className="py-3 text-right whitespace-nowrap">
                        <Link
                          href={`/customers?edit=${c.id}`}
                          className="mr-3 text-xs font-medium text-blue-600 hover:underline"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === c.id}
                          onClick={() => handleDelete(c)}
                          className="text-xs font-medium text-red-500 hover:underline disabled:opacity-50"
                        >
                          {deletingId === c.id ? "Deleting…" : "Delete"}
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
