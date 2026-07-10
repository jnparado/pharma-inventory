"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/ui";

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <PageHeader title="Product" />
      <div className="mx-auto max-w-lg rounded-xl border border-red-100 bg-red-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-red-800">
          Could not load products
        </h2>
        <p className="mt-2 text-sm text-red-700">
          {error.message ||
            "A server error occurred. Check Vercel env vars (Supabase URL, anon key, service role key) and redeploy."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    </>
  );
}
