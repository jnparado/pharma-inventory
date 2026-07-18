"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { Branch, StockTransfer } from "@/lib/types";
import {
  Badge,
  Card,
  EmptyState,
  TableScroll,
  buttonClass,
  inputClass,
  labelClass,
} from "@/components/ui";

type BranchStockSummary = {
  branch: Branch;
  total_skus: number;
  items: { sku: string; product_name: string; quantity: number }[];
};

type TransferRow = StockTransfer & {
  from_branch_info?: { name: string } | null;
  to_branch_info?: { name: string } | null;
};

export function BranchesWorkspace({
  initialBranches,
  initialTransfers,
  initialBranchStock,
  initialSuccess,
  initialError,
}: {
  initialBranches: Branch[];
  initialTransfers: TransferRow[];
  initialBranchStock: BranchStockSummary[];
  initialSuccess?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [branches, setBranches] = useState(initialBranches);
  const [transfers, setTransfers] = useState(initialTransfers);
  const [success, setSuccess] = useState(initialSuccess ?? "");
  const [error, setError] = useState(initialError ?? "");
  const [branchLoading, setBranchLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [updatingTransferId, setUpdatingTransferId] = useState<string | null>(
    null
  );

  useEffect(() => {
    setBranches(initialBranches);
  }, [initialBranches]);

  useEffect(() => {
    setTransfers(initialTransfers);
  }, [initialTransfers]);

  async function handleAddBranch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBranchLoading(true);
    const form = e.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.type = "branch";

    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        branch?: Branch;
      };

      if (!res.ok) {
        setError(data.error ?? "Could not add branch");
        return;
      }

      if (data.branch) {
        setBranches((prev) => [...prev, data.branch!]);
      }
      setSuccess(data.message ?? "Branch added");
      form.reset();
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message || "Could not add branch");
    } finally {
      setBranchLoading(false);
    }
  }

  async function handleCreateTransfer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setTransferLoading(true);
    const form = e.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.type = "transfer";

    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        transfer?: TransferRow;
      };

      if (!res.ok) {
        setError(data.error ?? "Could not create transfer");
        return;
      }

      if (data.transfer) {
        const fromId = data.transfer.from_branch;
        const toId = data.transfer.to_branch;
        const enriched: TransferRow = {
          ...data.transfer,
          from_branch_info: {
            name:
              branches.find((b) => b.id === fromId)?.name ?? "—",
          },
          to_branch_info: {
            name: branches.find((b) => b.id === toId)?.name ?? "—",
          },
        };
        setTransfers((prev) => [enriched, ...prev]);
      }
      setSuccess(data.message ?? "Transfer request created");
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message || "Could not create transfer");
    } finally {
      setTransferLoading(false);
    }
  }

  async function completeTransfer(id: string) {
    setError("");
    setUpdatingTransferId(id);
    const prev = transfers;
    setTransfers((list) =>
      list.map((t) => (t.id === id ? { ...t, status: "completed" } : t))
    );
    setSuccess("Transfer updated");

    try {
      const res = await fetch("/api/branches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "completed" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setTransfers(prev);
        setSuccess("");
        setError(data.error ?? "Could not update transfer");
        return;
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setTransfers(prev);
      setSuccess("");
      setError((err as Error).message || "Could not update transfer");
    } finally {
      setUpdatingTransferId(null);
    }
  }

  return (
    <>
      {success && (
        <div className="mb-4 rounded-lg border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Add branch">
          <form className="grid gap-3" onSubmit={handleAddBranch}>
            <div>
              <label className={labelClass} htmlFor="name">
                Branch name
              </label>
              <input
                id="name"
                name="name"
                required
                placeholder="Branch A — Makati"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="address">
                Address
              </label>
              <input id="address" name="address" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="phone">
                Phone
              </label>
              <input id="phone" name="phone" className={inputClass} />
            </div>
            <button type="submit" disabled={branchLoading} className={buttonClass}>
              {branchLoading ? "Adding…" : "Add branch"}
            </button>
          </form>
        </Card>

        <Card title="Transfer stock between branches">
          {branches.length < 2 ? (
            <EmptyState message="Add at least two branches to enable transfers." />
          ) : (
            <form className="grid gap-3" onSubmit={handleCreateTransfer}>
              <div>
                <label className={labelClass}>From branch</label>
                <select name="from_branch" required className={inputClass}>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>To branch</label>
                <select name="to_branch" required className={inputClass}>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={transferLoading}
                className={buttonClass}
              >
                {transferLoading ? "Creating…" : "Request transfer"}
              </button>
              <p className="text-xs text-slate-400">
                Example: Branch A lacks antibiotics — transfer from Branch B.
              </p>
            </form>
          )}
        </Card>
      </div>

      <Card title={`Branches (${initialBranchStock.length})`} className="mt-6">
        {initialBranchStock.length === 0 ? (
          <EmptyState message="No branches yet." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {initialBranchStock.map(({ branch, total_skus, items }) => (
              <div
                key={branch.id}
                className="rounded-lg border border-slate-100 bg-slate-50 p-4"
              >
                <h3 className="font-semibold text-slate-800">{branch.name}</h3>
                <p className="text-xs text-slate-500">{branch.address ?? "—"}</p>
                <p className="mt-2 text-sm">
                  <span className="font-medium">{total_skus}</span> SKUs in stock
                </p>
                {items.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {items.map((item) => (
                      <li key={item.sku}>
                        {item.product_name}: {item.quantity}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Stock transfers" className="mt-6">
        {transfers.length === 0 ? (
          <EmptyState message="No transfer requests yet." />
        ) : (
          <TableScroll>
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="pb-2">From</th>
                  <th className="pb-2">To</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2">{t.from_branch_info?.name ?? "—"}</td>
                    <td className="py-2">{t.to_branch_info?.name ?? "—"}</td>
                    <td className="py-2">
                      <Badge
                        tone={
                          t.status === "completed"
                            ? "success"
                            : t.status === "pending"
                              ? "warning"
                              : "default"
                        }
                      >
                        {t.status ?? "unknown"}
                      </Badge>
                    </td>
                    <td className="py-2">
                      {t.status === "pending" && (
                        <button
                          type="button"
                          disabled={updatingTransferId === t.id}
                          onClick={() => completeTransfer(t.id)}
                          className="text-xs font-medium text-teal-600 hover:underline disabled:opacity-50"
                        >
                          {updatingTransferId === t.id
                            ? "Updating…"
                            : "Mark completed"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Card>
    </>
  );
}
