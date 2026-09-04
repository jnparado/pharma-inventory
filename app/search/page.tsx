import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader, SetupNotice, TableScroll } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/data";
import { searchInventory } from "@/lib/search";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Search" />
        <SetupNotice />
      </>
    );
  }

  if (!query) {
    return (
      <>
        <PageHeader
          title="Search"
          description="Search products, SKUs, barcodes, invoices, receipts, suppliers, and customers."
        />
        <Card>
          <EmptyState message="Type a search term in the top bar to get started." />
        </Card>
      </>
    );
  }

  const {
    products: matchedProducts,
    sales: matchedSales,
    suppliers: matchedSuppliers,
    customers: matchedCustomers,
  } = await searchInventory(query).catch(() => ({
    products: [],
    sales: [],
    suppliers: [],
    customers: [],
  }));

  const totalResults =
    matchedProducts.length +
    matchedSales.length +
    matchedSuppliers.length +
    matchedCustomers.length;

  return (
    <>
      <PageHeader
        title={`Search results for “${query}”`}
        description={`${totalResults} result${totalResults === 1 ? "" : "s"} across products, sales, suppliers, and customers.`}
      />

      {totalResults === 0 && (
        <Card>
          <EmptyState message="Nothing matched. Try a product name, SKU, barcode, invoice, or receipt number." />
        </Card>
      )}

      <div className="space-y-6">
        {matchedProducts.length > 0 && (
          <Card title={`Products (${matchedProducts.length})`}>
            <TableScroll>
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pr-3 font-medium">Product</th>
                    <th className="pb-2 pr-3 font-medium">SKU</th>
                    <th className="pb-2 pr-3 font-medium">Stock</th>
                    <th className="pb-2 pr-3 font-medium">Price</th>
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matchedProducts.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 pr-3 font-medium text-slate-700">
                        {p.product_name}
                        {p.brand_name && (
                          <span className="ml-2 text-xs font-normal text-slate-400">
                            {p.brand_name}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-500">{p.sku}</td>
                      <td className="py-2.5 pr-3">
                        {p.total_stock > 0 ? (
                          <Badge tone="success">{p.total_stock} in stock</Badge>
                        ) : (
                          <Badge tone="danger">Out of stock</Badge>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600">
                        {formatCurrency(p.selling_price)}
                      </td>
                      <td className="py-2.5 text-right">
                        <Link
                          href="/products"
                          className="text-xs font-medium text-teal-600 hover:underline"
                        >
                          Open inventory →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </Card>
        )}

        {matchedSales.length > 0 && (
          <Card title={`Sales / invoices (${matchedSales.length})`}>
            <TableScroll>
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2 pr-3 font-medium">Invoice</th>
                    <th className="pb-2 pr-3 font-medium">Receipt</th>
                    <th className="pb-2 pr-3 font-medium">Amount</th>
                    <th className="pb-2 pr-3 font-medium">Date</th>
                    <th className="pb-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matchedSales.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2.5 pr-3 font-medium text-slate-700">
                        {s.invoice_number}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-500">
                        {s.receipt_number ?? "—"}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600">
                        {formatCurrency(s.total_amount)}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-500">
                        {s.created_at ? formatDateTime(s.created_at) : "—"}
                      </td>
                      <td className="py-2.5 text-right">
                        <Link
                          href={`/receipt/${s.id}`}
                          className="text-xs font-medium text-teal-600 hover:underline"
                        >
                          View receipt →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </Card>
        )}

        {matchedSuppliers.length > 0 && (
          <Card title={`Suppliers (${matchedSuppliers.length})`}>
            <ul className="divide-y divide-slate-100">
              {matchedSuppliers.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{s.company_name}</p>
                    <p className="text-xs text-slate-400">
                      {[s.contact_person, s.phone].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <Link
                    href="/suppliers"
                    className="shrink-0 text-xs font-medium text-teal-600 hover:underline"
                  >
                    Open suppliers →
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {matchedCustomers.length > 0 && (
          <Card title={`Customers (${matchedCustomers.length})`}>
            <ul className="divide-y divide-slate-100">
              {matchedCustomers.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {c.full_name ?? "Unnamed customer"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {[c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <Link
                    href="/customers"
                    className="shrink-0 text-xs font-medium text-teal-600 hover:underline"
                  >
                    Open customers →
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
