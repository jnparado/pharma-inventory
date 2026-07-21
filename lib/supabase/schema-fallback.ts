import type { BatchWithProduct } from "@/lib/types";

export function isSchemaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("column") ||
    lower.includes("schema cache") ||
    lower.includes("does not exist")
  );
}

export const BATCH_WITH_PRODUCT_SELECTS = [
  "*, products(product_name, sku, unit, selling_price), suppliers(company_name)",
  "*, products(product_name, unit, selling_price), suppliers(company_name)",
  "*, products(product_name, selling_price_retail, selling_price_ws), suppliers(company_name)",
  "*, products(product_name, selling_price_retail), suppliers(company_name)",
  "*, products(product_name, brand_name, selling_price_retail)",
  "*, products(product_name)",
  "*",
] as const;

export const TRANSACTION_SELECTS = [
  "*, products(product_name, sku, unit), product_batches(batch_number)",
  "*, products(product_name, unit), product_batches(batch_number)",
  "*, products(product_name), product_batches(batch_number)",
  "*",
] as const;

export const SALE_WITH_ITEMS_SELECTS = [
  "id, total_amount, created_at, payment_method, invoice_number, sale_items(quantity, subtotal, unit_price, product_id, products(product_name, sku, unit))",
  "id, total_amount, created_at, payment_method, invoice_number, sale_items(quantity, subtotal, unit_price, product_id, products(product_name, unit))",
  "id, total_amount, created_at, payment_method, invoice_number, sale_items(quantity, subtotal, unit_price, product_id, products(product_name))",
  "id, total_amount, created_at, payment_method, invoice_number, sale_items(quantity, subtotal, unit_price, product_id)",
] as const;

export const SALE_DETAIL_SELECTS = [
  "*, sale_items(*, products(product_name, sku, unit))",
  "*, sale_items(*, products(product_name, unit))",
  "*, sale_items(*, products(product_name))",
  "*, sale_items(*)",
] as const;

export const PURCHASE_ORDER_SELECTS = [
  "*, suppliers(company_name, contact_person, phone, email, address), purchase_order_items(*, products(product_name, sku, unit, selling_price, selling_price_retail, cost))",
  "*, suppliers(company_name, contact_person, phone, email, address), purchase_order_items(*, products(product_name, unit, selling_price_retail, cost))",
  "*, suppliers(company_name, address), purchase_order_items(*, products(product_name, selling_price_retail, cost))",
  "*, suppliers(company_name), purchase_order_items(*, products(product_name, unit, selling_price, selling_price_retail, cost))",
  "*, suppliers(company_name), purchase_order_items(*, products(product_name, unit, selling_price_retail, cost))",
  "*, suppliers(company_name), purchase_order_items(*, products(product_name, selling_price_retail, cost))",
  "*, suppliers(company_name), purchase_order_items(*, products(product_name, unit))",
  "*, suppliers(company_name), purchase_order_items(*, products(product_name))",
  "*, suppliers(company_name), purchase_order_items(*)",
  "*, purchase_order_items(*, products(product_name))",
  "*",
] as const;

export const PO_CONVERT_SELECTS = [
  "id, po_number, status, supplier_id, purchase_order_items(id, product_id, quantity, unit_cost, products(product_name, selling_price, selling_price_retail, cost))",
  "id, po_number, status, supplier_id, purchase_order_items(id, product_id, quantity, unit_cost, products(product_name, selling_price_retail, cost))",
  "id, po_number, status, supplier_id, purchase_order_items(id, product_id, quantity, unit_cost, products(product_name, cost))",
  "id, po_number, status, supplier_id, purchase_order_items(id, product_id, quantity, unit_cost, products(product_name))",
  "id, po_number, status, supplier_id, purchase_order_items(id, product_id, quantity, unit_cost)",
] as const;

export function productSellingPrice(
  product: Record<string, unknown> | null | undefined
): number {
  if (!product) return 0;
  return Number(
    product.selling_price ??
      product.selling_price_retail ??
      product.price ??
      product.cost ??
      0
  );
}

export function authCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export function normalizeJoinedProduct(
  product: Record<string, unknown> | null | undefined
): {
  product_name: string;
  sku: string;
  unit: string;
  selling_price: number;
} | null {
  if (!product) return null;
  return {
    product_name: String(product.product_name ?? "Unknown"),
    sku: String(product.sku ?? product.lot_number ?? "—"),
    unit: String(product.unit ?? "PCS"),
    selling_price: Number(
      product.selling_price ?? product.selling_price_retail ?? product.price ?? 0
    ),
  };
}

export function normalizeBatchRows(data: unknown[]): BatchWithProduct[] {
  return (data ?? []).map((row) => {
    const batch = row as BatchWithProduct & {
      products?: Record<string, unknown> | null;
    };
    const normalized = normalizeJoinedProduct(batch.products ?? null);
    if (normalized) {
      batch.products = normalized;
    }
    return batch as BatchWithProduct;
  });
}
