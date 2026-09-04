import { ProductsWorkspace } from "@/components/products-workspace";
import { productTableHasRackColumn } from "@/lib/products-db";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getProductInventoryLines,
  getSuppliers,
} from "@/lib/data";
import { hasServiceRoleKey } from "@/lib/env";
import { canManageRecords } from "@/lib/permissions";
import { getActiveUser } from "@/lib/user-session";
import { FlashMessage } from "@/components/ui";

function findEditingLine(
  lines: Awaited<ReturnType<typeof getProductInventoryLines>>,
  editId: string | undefined
) {
  if (!editId) return null;
  return (
    lines.find(
      (line) => line.batch_id === editId || line.product_id === editId
    ) ?? null
  );
}

export async function ProductsPageContent({
  success,
  error,
  edit,
  today,
}: {
  success?: string;
  error?: string;
  edit?: string;
  today: string;
}) {
  let lines: Awaited<ReturnType<typeof getProductInventoryLines>> = [];
  let suppliers: Awaited<ReturnType<typeof getSuppliers>> = [];
  let activeUser: Awaited<ReturnType<typeof getActiveUser>> = null;
  let loadError = error ?? "";
  let hasRackColumn = true;

  try {
    const supabase = createAdminClient();
    [lines, suppliers, activeUser, hasRackColumn] = await Promise.all([
      getProductInventoryLines(),
      getSuppliers(),
      getActiveUser(),
      productTableHasRackColumn(supabase).catch(() => false),
    ]);
  } catch (e) {
    loadError =
      loadError ||
      (e as Error).message ||
      "Could not load products. Check Supabase env vars and redeploy.";
  }

  const isAdmin = canManageRecords(activeUser);
  const editing = findEditingLine(lines, edit);

  return (
    <>
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

      {hasServiceRoleKey() === false && (
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
