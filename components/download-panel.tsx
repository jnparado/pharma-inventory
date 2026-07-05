import Link from "next/link";

const exports = [
  {
    label: "Sales report",
    description: "All invoices with line items",
    csv: "/api/export/sales",
    json: "/api/export/sales?format=json",
  },
  {
    label: "Products catalog",
    description: "SKU, price, stock levels",
    csv: "/api/export/products",
    json: "/api/export/products?format=json",
  },
  {
    label: "Inventory batches",
    description: "Batch numbers, expiry, quantities",
    csv: "/api/export/inventory",
    json: "/api/export/inventory?format=json",
  },
  {
    label: "Stock transactions",
    description: "Stock in / out history",
    csv: "/api/export/transactions",
    json: "/api/export/transactions?format=json",
  },
  {
    label: "Purchase orders",
    description: "Supplier orders and items",
    csv: "/api/export/orders",
    json: "/api/export/orders?format=json",
  },
];

export function DownloadPanel({ title }: { title?: string }) {
  return (
    <div>
      {title && (
        <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {exports.map((item) => (
          <div
            key={item.csv}
            className="rounded-lg border border-slate-200 bg-slate-50 p-4"
          >
            <p className="font-medium text-slate-800">{item.label}</p>
            <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
            <div className="mt-3 flex gap-2">
              <Link
                href={item.csv}
                download
                className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
              >
                Download CSV
              </Link>
              <Link
                href={item.json}
                download
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Download JSON
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
