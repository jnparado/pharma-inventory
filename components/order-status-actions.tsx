"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass } from "@/components/ui";

export function OrderStatusActions({
  orderId,
  status,
  hasInvoice,
}: {
  orderId: string;
  status: string;
  hasInvoice: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function updateStatus(nextStatus: string) {
    setError("");
    setLoading(nextStatus);

    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status: nextStatus }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Could not update order");
        setLoading(null);
        return;
      }

      router.refresh();
    } catch (err) {
      setError((err as Error).message || "Could not update order");
    } finally {
      setLoading(null);
    }
  }

  if (hasInvoice || status !== "pending") {
    return null;
  }

  return (
    <>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => updateStatus("approved")}
          className={buttonClass}
        >
          {loading === "approved"
            ? "Processing…"
            : "Generate Sales Invoice & add stock"}
        </button>
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => updateStatus("delivered")}
          className="text-sm font-medium text-slate-500 hover:underline disabled:opacity-50"
        >
          {loading === "delivered" ? "Updating…" : "Mark delivered"}
        </button>
      </div>
    </>
  );
}
