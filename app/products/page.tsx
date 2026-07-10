import Link from "next/link";
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "@/app/actions";
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
  buttonClass,
  inputClass,
  labelClass,
} from "@/components/ui";

function ProductFields({
  editing,
  today,
}: {
  editing?: {
    entry_date: string | null;
    product_name: string;
    brand: string | null;
    quantity: number;
    lot_number: string;
    expiry_date: string | null;
    cost: number | null;
    selling_price_ws: number | null;
    selling_price_retail: number;
  } | null;
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
          <form action={updateProduct} className="grid gap-4 sm:grid-cols-3">
            <input type="hidden" name="batch_id" value={editing.batch_id} />
            <input type="hidden" name="product_id" value={editing.product_id} />
            <ProductFields editing={editing} today={today} />
            <div className="flex flex-wrap gap-2 sm:col-span-3">
              <button type="submit" className={buttonClass}>
                Save changes
              </button>
              <Link
                href="/products"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </Card>
      )}

      {isAdmin && !editing && (
        <Card title="Add product" className="mb-6">
          <form action={createProduct} className="grid gap-4 sm:grid-cols-3">
            <ProductFields today={today} />
            <div className="sm:col-span-3">
              <button type="submit" className={buttonClass}>
                Add product
              </button>
            </div>
          </form>
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
