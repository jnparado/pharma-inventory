import Link from "next/link";
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "@/app/actions";
import {
  getCategories,
  getProductById,
  getProductsWithStock,
  isSupabaseConfigured,
} from "@/lib/data";
import { canManageRecords } from "@/lib/permissions";
import { getActiveUser } from "@/lib/user-session";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Badge,
  Card,
  EmptyState,
  FlashMessage,
  PageHeader,
  SetupNotice,
  buttonClass,
  inputClass,
  labelClass,
} from "@/components/ui";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; edit?: string }>;
}) {
  const { success, error, edit } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Products" />
        <SetupNotice />
      </>
    );
  }

  const [products, categories, activeUser, editing] = await Promise.all([
    getProductsWithStock(),
    getCategories(),
    getActiveUser(),
    edit ? getProductById(edit) : Promise.resolve(null),
  ]);

  const isAdmin = canManageRecords(activeUser);

  const defaultCategories = [
    "Analgesic",
    "Antibiotic",
    "Antihistamine",
    "Cough & Cold",
    "Diabetes",
    "Hypertension",
    "Vitamins & Supplements",
    "First Aid",
  ];
  const categoryOptions = Array.from(
    new Set([...categories.map((c) => c.name), ...defaultCategories])
  ).sort();

  const unitOptions = [
    "pcs",
    "tablet",
    "capsule",
    "box",
    "bottle",
    "vial",
    "sachet",
    "tube",
    "ml",
  ];

  return (
    <>
      <PageHeader
        title="Products"
        description="Medicine catalog with SKUs, categories, and reorder levels."
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
            <input type="hidden" name="id" value={editing.id} />
            <div>
              <label className={labelClass} htmlFor="edit_product_name">
                Product name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit_product_name"
                name="product_name"
                required
                defaultValue={editing.product_name}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="edit_generic_name">
                Generic name
              </label>
              <input
                id="edit_generic_name"
                name="generic_name"
                defaultValue={editing.generic_name ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="edit_brand_name">
                Brand name
              </label>
              <input
                id="edit_brand_name"
                name="brand_name"
                defaultValue={editing.brand_name ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="edit_sku">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                id="edit_sku"
                name="sku"
                required
                defaultValue={editing.sku}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="edit_barcode">
                Barcode
              </label>
              <input
                id="edit_barcode"
                name="barcode"
                defaultValue={editing.barcode ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="edit_category">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="edit_category"
                name="category"
                required
                defaultValue={
                  categories.find((c) => c.id === editing.category_id)?.name ??
                  ""
                }
                className={inputClass}
              >
                <option value="" disabled>
                  Select a category…
                </option>
                {categoryOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="edit_unit">
                Unit <span className="text-red-500">*</span>
              </label>
              <select
                id="edit_unit"
                name="unit"
                required
                defaultValue={editing.unit ?? "pcs"}
                className={inputClass}
              >
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="edit_selling_price">
                Selling price (&#8369;) <span className="text-red-500">*</span>
              </label>
              <input
                id="edit_selling_price"
                name="selling_price"
                type="number"
                step="0.01"
                min={0}
                required
                defaultValue={editing.selling_price}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="edit_reorder_level">
                Reorder level <span className="text-red-500">*</span>
              </label>
              <input
                id="edit_reorder_level"
                name="reorder_level"
                type="number"
                min={0}
                required
                defaultValue={editing.reorder_level ?? 10}
                className={inputClass}
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                id="edit_requires_prescription"
                name="requires_prescription"
                type="checkbox"
                defaultChecked={!!editing.requires_prescription}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <label
                htmlFor="edit_requires_prescription"
                className="text-sm text-slate-600"
              >
                Requires prescription (Rx)
              </label>
            </div>
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
          <div>
            <label className={labelClass} htmlFor="product_name">
              Product name <span className="text-red-500">*</span>
            </label>
            <input
              id="product_name"
              name="product_name"
              required
              placeholder="Amoxicillin 500mg"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="generic_name">
              Generic name
            </label>
            <input
              id="generic_name"
              name="generic_name"
              placeholder="Amoxicillin"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="brand_name">
              Brand name
            </label>
            <input
              id="brand_name"
              name="brand_name"
              placeholder="Amoxil"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="sku">
              SKU <span className="text-red-500">*</span>
            </label>
            <input
              id="sku"
              name="sku"
              required
              placeholder="MED-0009"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="barcode">
              Barcode
            </label>
            <input
              id="barcode"
              name="barcode"
              placeholder="Scan or enter barcode"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="category">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              name="category"
              required
              defaultValue=""
              className={inputClass}
            >
              <option value="" disabled>
                Select a category…
              </option>
              {categoryOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="unit">
              Unit <span className="text-red-500">*</span>
            </label>
            <select
              id="unit"
              name="unit"
              required
              defaultValue="pcs"
              className={inputClass}
            >
              {unitOptions.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="selling_price">
              Selling price (&#8369;) <span className="text-red-500">*</span>
            </label>
            <input
              id="selling_price"
              name="selling_price"
              type="number"
              step="0.01"
              min={0}
              required
              placeholder="0.00"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="reorder_level">
              Reorder level <span className="text-red-500">*</span>
            </label>
            <input
              id="reorder_level"
              name="reorder_level"
              type="number"
              min={0}
              defaultValue={10}
              required
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-400">
              Alerts trigger when stock falls to this level.
            </p>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input
              id="requires_prescription"
              name="requires_prescription"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <label
              htmlFor="requires_prescription"
              className="text-sm text-slate-600"
            >
              Requires prescription (Rx)
            </label>
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className={buttonClass}>
              Add product
            </button>
          </div>
        </form>
      </Card>
      )}

      <Card title={`Catalog (${products.length})`}>
        {products.length === 0 ? (
          <EmptyState message="No products yet. Add your first medicine above." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">SKU</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Price</th>
                  <th className="pb-2 font-medium">Stock</th>
                  <th className="pb-2 font-medium">Reorder at</th>
                  <th className="pb-2 font-medium">Nearest expiry</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 font-medium text-slate-700">
                      {p.product_name}
                      {p.requires_prescription && (
                        <span className="ml-2 align-middle">
                          <Badge tone="info">Rx</Badge>
                        </span>
                      )}
                      {(p.generic_name || p.brand_name) && (
                        <p className="text-xs font-normal text-slate-400">
                          {[p.generic_name, p.brand_name]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </td>
                    <td className="py-3 font-mono text-xs text-slate-500">
                      {p.sku}
                    </td>
                    <td className="py-3">
                      {p.categories?.name ? (
                        <Badge>{p.categories.name}</Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      {formatCurrency(p.selling_price)}
                    </td>
                    <td className="py-3">
                      <span
                        className={
                          p.total_stock === 0
                            ? "font-semibold text-red-600"
                            : p.total_stock <= (p.reorder_level ?? 0)
                              ? "font-semibold text-amber-600"
                              : ""
                        }
                      >
                        {p.total_stock} {p.unit ?? "pcs"}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">
                      {p.reorder_level ?? 0}
                    </td>
                    <td className="py-3 text-slate-500">
                      {p.nearest_expiry ? formatDate(p.nearest_expiry) : "—"}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      {isAdmin ? (
                        <>
                          <Link
                            href={`/products?edit=${p.id}`}
                            className="mr-3 text-xs font-medium text-teal-600 hover:underline"
                          >
                            Edit
                          </Link>
                          <form action={deleteProduct} className="inline">
                            <input type="hidden" name="id" value={p.id} />
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
