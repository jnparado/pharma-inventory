import { ProductsWorkspace } from "@/components/products-workspace";
import { productTableHasRackColumn } from "@/lib/products-db";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getProductInventoryLineByBatchId,
  getProductInventoryLines,
  getSuppliers,
  isSupabaseConfigured,
} from "@/lib/data";
import { hasServiceRoleKey } from "@/lib/env";
import { canManageRecords } from "@/lib/permissions";
import { getActiveUser } from "@/lib/user-session";
import {
  FlashMessage,
  PageHeader,
  SetupNotice,
} from "@/components/ui";


export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; edit?: string }>;
}) {
  const { success, error, edit } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Product" />
        <SetupNotice />
      </>
    );
  }

  let lines: Awaited<ReturnType<typeof getProductInventoryLines>> = [];
  let suppliers: Awaited<ReturnType<typeof getSuppliers>> = [];
  let activeUser: Awaited<ReturnType<typeof getActiveUser>> = null;
  let editing: Awaited<ReturnType<typeof getProductInventoryLineByBatchId>> =
    null;
  let loadError = error ?? "";
  let hasRackColumn = true;

  try {
    const supabase = createAdminClient();
    [lines, suppliers, activeUser, editing, hasRackColumn] = await Promise.all([
      getProductInventoryLines(),
      getSuppliers(),
      getActiveUser(),
      edit ? getProductInventoryLineByBatchId(edit) : Promise.resolve(null),
      productTableHasRackColumn(supabase).catch(() => false),
    ]);
  } catch (e) {
    loadError =
      loadError ||
      (e as Error).message ||
      "Could not load products. Check Supabase env vars and redeploy.";
  }

  const isAdmin = canManageRecords(activeUser);

  return (
    <>
      <PageHeader
        title="Product"
        description="Inventory register — date, product, supplier, brand, lot, expiry, quantity, UOM, cost, and wholesale/retail prices."
      />
      {loadError && !success && <FlashMessage error={loadError} />}

      {isAdmin && !hasRackColumn && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The <code className="rounded bg-amber-100 px-1">rack_location</code>{" "}
          column is missing on <code className="rounded bg-amber-100 px-1">products</code>.
          Run in Supabase SQL Editor:{" "}
          <code className="rounded bg-amber-100 px-1">
            ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rack_location text;
          </code>
        </p>
      )}

      {isSupabaseConfigured() && !hasServiceRoleKey() && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          in Vercel environment variables to enable add, edit, and delete.
        </p>
      )}

      {!isAdmin && (
        <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          View-only mode. Contact an admin to add or edit products.
        </p>
      )}

      <ProductsWorkspace
        initialLines={lines}
        suppliers={suppliers}
        today={today}
        isAdmin={isAdmin}
        initialEditing={editing}
        initialSuccess={success}
        initialError={loadError || undefined}
      />
    </>
  );
}
