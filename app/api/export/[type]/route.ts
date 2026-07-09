import { NextResponse } from "next/server";
import {
  getBatches,
  getCustomers,
  getProductsWithStock,
  getPurchaseOrders,
  getSales,
  getSuppliers,
  getTransactions,
  isSupabaseConfigured,
} from "@/lib/data";
import {
  csvDownloadResponse,
  excelCsvDownloadResponse,
  jsonDownloadResponse,
  toCsv,
} from "@/lib/export";
import { formatDate, formatDateTime } from "@/lib/utils";

type ExportType =
  | "sales"
  | "products"
  | "inventory"
  | "batches"
  | "customers"
  | "suppliers"
  | "transactions"
  | "orders";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const { type } = await params;
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "csv";
  const exportType = type as ExportType;

  try {
    switch (exportType) {
      case "sales":
        return exportSales(format);
      case "products":
      case "inventory":
        return exportInventory(format);
      case "batches":
        return exportInventoryBatches(format);
      case "customers":
        return exportCustomers(format);
      case "suppliers":
        return exportSuppliers(format);
      case "transactions":
        return exportTransactions(format);
      case "orders":
        return exportOrders(format);
      default:
        return NextResponse.json({ error: "Unknown export type" }, { status: 404 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

async function exportSales(format: string) {
  const sales = await getSales(1000);
  const rows: (string | number)[][] = [];

  for (const sale of sales) {
    for (const item of sale.sale_items ?? []) {
      rows.push([
        sale.invoice_number,
        sale.created_at ? formatDateTime(sale.created_at) : "",
        sale.payment_method ?? "",
        item.products?.product_name ?? "",
        item.products?.sku ?? "",
        item.quantity,
        item.unit_price,
        item.subtotal,
        sale.total_amount,
      ]);
    }
    if (!sale.sale_items?.length) {
      rows.push([
        sale.invoice_number,
        sale.created_at ? formatDateTime(sale.created_at) : "",
        sale.payment_method ?? "",
        "",
        "",
        0,
        0,
        0,
        sale.total_amount,
      ]);
    }
  }

  const headers = [
    "Invoice",
    "Date",
    "Payment",
    "Product",
    "SKU",
    "Qty",
    "Unit Price",
    "Line Total",
    "Sale Total",
  ];

  if (format === "json") {
    return jsonDownloadResponse("sales-report.json", sales);
  }
  return csvDownloadResponse(
    `sales-report-${dateStamp()}.csv`,
    toCsv(headers, rows)
  );
}

async function exportInventory(format: string) {
  const products = await getProductsWithStock();
  const rows = products.map((p) => [
    p.sku,
    p.barcode ?? "",
    p.product_name,
    p.generic_name ?? "",
    p.brand_name ?? "",
    p.categories?.name ?? "",
    p.unit ?? "",
    p.selling_price,
    p.total_stock,
    p.reorder_level ?? 0,
    p.nearest_expiry ? formatDate(p.nearest_expiry) : "",
    p.requires_prescription ? "Yes" : "No",
  ]);

  const headers = [
    "SKU",
    "Barcode",
    "Product Name",
    "Generic Name",
    "Brand",
    "Category",
    "Unit",
    "Selling Price (PHP)",
    "Stock Qty",
    "Reorder Level",
    "Nearest Expiry",
    "Prescription Required",
  ];

  if (format === "json") {
    return jsonDownloadResponse("inventory-list.json", products);
  }
  return excelCsvDownloadResponse(
    `inventory-list-${dateStamp()}.csv`,
    toCsv(headers, rows)
  );
}

async function exportCustomers(format: string) {
  const customers = await getCustomers();
  const rows = customers.map((c) => [
    c.full_name ?? "",
    c.email ?? "",
    c.phone ?? "",
    c.address ?? "",
    c.created_at ? formatDateTime(c.created_at) : "",
  ]);

  const headers = ["Full Name", "Email", "Phone", "Address", "Registered"];

  if (format === "json") {
    return jsonDownloadResponse("customers-list.json", customers);
  }
  return excelCsvDownloadResponse(
    `customers-list-${dateStamp()}.csv`,
    toCsv(headers, rows)
  );
}

async function exportSuppliers(format: string) {
  const suppliers = await getSuppliers();
  const rows = suppliers.map((s) => [
    s.company_name,
    s.contact_person ?? "",
    s.phone ?? "",
    s.email ?? "",
    s.address ?? "",
    s.created_at ? formatDateTime(s.created_at) : "",
  ]);

  const headers = [
    "Company Name",
    "Contact Person",
    "Phone",
    "Email",
    "Address",
    "Added",
  ];

  if (format === "json") {
    return jsonDownloadResponse("suppliers-list.json", suppliers);
  }
  return excelCsvDownloadResponse(
    `suppliers-list-${dateStamp()}.csv`,
    toCsv(headers, rows)
  );
}

async function exportTransactions(format: string) {
  const transactions = await getTransactions(1000);
  const rows = transactions.map((t) => [
    t.created_at ? formatDateTime(t.created_at) : "",
    t.transaction_type,
    t.products?.product_name ?? "",
    t.products?.sku ?? "",
    t.product_batches?.batch_number ?? "",
    t.quantity,
    t.reference_no ?? "",
  ]);

  const headers = [
    "Date",
    "Type",
    "Product",
    "SKU",
    "Batch",
    "Qty",
    "Reference",
  ];

  if (format === "json") {
    return jsonDownloadResponse("transactions.json", transactions);
  }
  return csvDownloadResponse(
    `transactions-${dateStamp()}.csv`,
    toCsv(headers, rows)
  );
}

async function exportOrders(format: string) {
  const orders = await getPurchaseOrders();
  const rows: (string | number)[][] = [];
  for (const po of orders) {
    for (const item of po.purchase_order_items ?? []) {
      rows.push([
        po.po_number,
        po.status ?? "",
        po.suppliers?.company_name ?? "",
        po.created_at ? formatDateTime(po.created_at) : "",
        item.products?.product_name ?? "",
        item.quantity,
        item.unit_cost ?? 0,
      ]);
    }
  }

  const headers = [
    "PO Number",
    "Status",
    "Supplier",
    "Date",
    "Product",
    "Qty",
    "Unit Cost",
  ];

  if (format === "json") {
    return jsonDownloadResponse("purchase-orders.json", orders);
  }
  return csvDownloadResponse(
    `purchase-orders-${dateStamp()}.csv`,
    toCsv(headers, rows)
  );
}

async function exportInventoryBatches(format: string) {
  const batches = await getBatches();
  const rows = batches.map((b) => [
    b.products?.product_name ?? "",
    b.products?.sku ?? "",
    b.batch_number,
    b.suppliers?.company_name ?? "",
    b.expiry_date ?? "",
    b.quantity_remaining ?? 0,
    b.purchase_price ?? 0,
  ]);

  const headers = [
    "Product",
    "SKU",
    "Batch",
    "Supplier",
    "Expiry",
    "Qty Remaining",
    "Cost",
  ];

  if (format === "json") {
    return jsonDownloadResponse("inventory-batches.json", batches);
  }
  return excelCsvDownloadResponse(
    `inventory-batches-${dateStamp()}.csv`,
    toCsv(headers, rows)
  );
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}
