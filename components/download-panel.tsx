import Link from "next/link";

const primaryExports = [
  {
    label: "Inventory",
    description: "All products with stock, price, expiry, and reorder levels",
    csv: "/api/export/inventory",
    json: "/api/export/inventory?format=json",
  },
  {
    label: "Customers",
    description: "Customer names, contact details, and registration dates",
    csv: "/api/export/customers",
    json: "/api/export/customers?format=json",
  },
  {
    label: "Suppliers",
    description: "Supplier companies, contacts, and addresses",
    csv: "/api/export/suppliers",
    json: "/api/export/suppliers?format=json",
  },
];

const otherExports = [
  {
    label: "Sales report",
    description: "All invoices with line items",
    csv: "/api/export/sales",
    json: "/api/export/sales?format=json",
  },
  {
    label: "Inventory batches",
    description: "Batch numbers, expiry dates, and quantities",
    csv: "/api/export/batches",
    json: "/api/export/batches?format=json",
  },
  {
    label: "Stock transactions",
    description: "Stock in / out history",
    csv: "/api/export/transactions",
    json: "/api/export/transactions?format=json",
  },
  {
    label: "Purchase orders",
    description: "Supplier orders and line items",
    csv: "/api/export/orders",
    json: "/api/export/orders?format=json",
  },
];

function ExportGrid({
  items,
  excelLabel = "Download Excel (CSV)",
}: {
  items: typeof primaryExports;
  excelLabel?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.csv}
          className="rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <p className="font-medium text-slate-800">{item.label}</p>
          <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={item.csv}
              download
              className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
            >
              {excelLabel}
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
  );
}

export function DownloadPanel({ title }: { title?: string }) {
  return (
    <div>
      {title && (
        <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      )}
      <p className="mb-4 text-sm text-slate-500">
        CSV files open directly in Microsoft Excel, Google Sheets, or LibreOffice.
      </p>

      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Inventory &amp; contacts
      </h4>
      <ExportGrid items={primaryExports} />

      <h4 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Sales &amp; operations
      </h4>
      <ExportGrid items={otherExports} excelLabel="Download CSV" />
    </div>
  );
}
