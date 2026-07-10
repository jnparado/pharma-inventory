import Link from "next/link";
import { deleteProduct } from "@/app/actions";
import { ProductEntryForm } from "@/components/product-entry-form";
import {
  getProductInventoryLineByBatchId,
  getProductInventoryLines,
  isSupabaseConfigured,
} from "@/lib/data";
import { canManageRecords } from "@/lib/permissions";
import { getActiveUser } from "@/lib/user-session";
import { formatCurrency, formatDate } from "@/lib/utils";
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

  const [lines, activeUser, editing] = await Promise.all([
    getProductInventoryLines(),
    getActiveUser(),
    edit ? getProductInventoryLineByBatchId(edit) : Promise.resolve(null),
  ]);

  const isAdmin = canManageRecords(activeUser);

  return (
    <>
      <PageHeader
        title="Product"
        description="Inventory register — date, product, brand, quantity, lot, expiry, cost, and wholesale/retail prices."
      />
      <FlashMessage success={success} error={error} />

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-3 font-medium">Date</th>
                  <th className="pb-2 pr-3 font-medium">Product name</th>
                  <th className="pb-2 pr-3 font-medium">Brand</th>
                  <th className="pb-2 pr-3 font-medium">Quantity</th>
                  <th className="pb-2 pr-3 font-medium">Lot number</th>
                  <th className="pb-2 pr-3 font-medium">Exp date</th>
                  <th className="pb-2 pr-3 font-medium">Cost</th>
                  <th className="pb-2 pr-3 font-medium">Selling price WS</th>
                  <th className="pb-2 pr-3 font-medium">Selling price retail</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line) => (
                  <tr key={line.batch_id}>
                    <td className="py-3 pr-3 whitespace-nowrap text-slate-600">
                      {line.entry_date ? formatDate(line.entry_date) : "—"}
                    </td>
                    <td className="py-3 pr-3 font-medium text-slate-700">
                      {line.product_name}
                    </td>
                    <td className="py-3 pr-3 text-slate-600">
                      {line.brand ?? "—"}
                    </td>
                    <td className="py-3 pr-3">{line.quantity}</td>
                    <td className="py-3 pr-3 font-mono text-xs text-slate-500">
                      {line.lot_number}
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap text-slate-600">
                      {line.expiry_date ? formatDate(line.expiry_date) : "—"}
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      {formatCurrency(line.cost ?? 0)}
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      {formatCurrency(line.selling_price_ws ?? 0)}
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      {formatCurrency(line.selling_price_retail)}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      {isAdmin ? (
                        <>
                          <Link
                            href={`/products?edit=${line.batch_id}`}
                            className="mr-3 text-xs font-medium text-teal-600 hover:underline"
                          >
                            Edit
                          </Link>
                          <form action={deleteProduct} className="inline">
                            <input
                              type="hidden"
                              name="batch_id"
                              value={line.batch_id}
                            />
                            <input
                              type="hidden"
                              name="product_id"
                              value={line.product_id}
                            />
                            <button
                              type="submit"
                              className="text-xs font-medium text-red-500 hover:underline"
                            >
                              Delete
                            </button>
                          </form>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
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
