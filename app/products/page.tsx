import { ProductEntryForm } from "@/components/product-entry-form";
import { ProductInventoryTable } from "@/components/product-inventory-table";
import {
  getProductInventoryLineByBatchId,
  getProductInventoryLines,
  isSupabaseConfigured,
} from "@/lib/data";
import { hasServiceRoleKey } from "@/lib/env";
import { canManageRecords } from "@/lib/permissions";
import { getActiveUser } from "@/lib/user-session";
import {
  Card,
  EmptyState,
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
  let activeUser: Awaited<ReturnType<typeof getActiveUser>> = null;
  let editing: Awaited<ReturnType<typeof getProductInventoryLineByBatchId>> =
    null;
  let loadError = error ?? "";

  try {
    [lines, activeUser, editing] = await Promise.all([
      getProductInventoryLines(),
      getActiveUser(),
      edit ? getProductInventoryLineByBatchId(edit) : Promise.resolve(null),
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
        description="Inventory register — date, product, brand, quantity, lot, expiry, cost, and wholesale/retail prices."
      />
      <FlashMessage success={success} error={loadError || undefined} />

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

      {isAdmin && editing && (
        <Card title="Edit product" className="mb-6">
          <ProductEntryForm
            mode="edit"
            editing={{
              ...editing,
              batch_id: editing.batch_id,
              product_id: editing.product_id,
            }}
            today={today}
          />
        </Card>
      )}

      {isAdmin && !editing && (
        <Card title="Add product" className="mb-6">
          <ProductEntryForm mode="create" today={today} />
        </Card>
      )}

      <Card title={`Product inventory (${lines.length})`}>
        {lines.length === 0 ? (
          <EmptyState message="No products yet. Add your first entry above." />
        ) : (
          <ProductInventoryTable lines={lines} isAdmin={isAdmin} />
        )}
      </Card>
    </>
  );
}
