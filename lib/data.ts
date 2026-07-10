import { cache } from "react";
import { normalizeCustomer } from "@/lib/customers-db";
import { isSupabaseConfigured } from "@/lib/env";
import { getSalesMetrics } from "@/lib/sales-metrics";
import { createAdminClient } from "@/lib/supabase/admin";
import { expiryStatus } from "@/lib/utils";
import type {
  BatchWithProduct,
  Category,
  Product,
  ProductWithStock,
  Supplier,
  Customer,
  TransactionWithProduct,
  PurchaseOrder,
  SaleWithItems,
  SalesReportSummary,
  User,
  Notification,
} from "@/lib/types";

export { isSupabaseConfigured };

export async function getProducts(): Promise<Product[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("product_name");
  if (error) throw new Error(`Failed to load products: ${error.message}`);
  return data;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");
  if (error) throw new Error(`Failed to load categories: ${error.message}`);
  return data;
}

export const getProductsWithStock = cache(async (): Promise<ProductWithStock[]> => {
  const supabase = createAdminClient();
  const [productsRes, batchesRes] = await Promise.all([
    supabase
      .from("products")
      .select("*, categories(name)")
      .order("product_name"),
    supabase
      .from("product_batches")
      .select("product_id, quantity_remaining, expiry_date"),
  ]);
  if (productsRes.error)
    throw new Error(`Failed to load products: ${productsRes.error.message}`);
  if (batchesRes.error)
    throw new Error(`Failed to load batches: ${batchesRes.error.message}`);

  const stockByProduct = new Map<
    string,
    { total: number; nearestExpiry: string | null }
  >();
  for (const batch of batchesRes.data) {
    if (!batch.product_id) continue;
    const qty = batch.quantity_remaining ?? 0;
    const entry = stockByProduct.get(batch.product_id) ?? {
      total: 0,
      nearestExpiry: null,
    };
    entry.total += qty;
    if (
      qty > 0 &&
      batch.expiry_date &&
      (entry.nearestExpiry === null || batch.expiry_date < entry.nearestExpiry)
    ) {
      entry.nearestExpiry = batch.expiry_date;
    }
    stockByProduct.set(batch.product_id, entry);
  }

  return (productsRes.data as unknown as ProductWithStock[]).map((product) => {
    const entry = stockByProduct.get(product.id);
    return {
      ...product,
      total_stock: entry?.total ?? 0,
      nearest_expiry: entry?.nearestExpiry ?? null,
    };
  });
});

export async function getSuppliers(): Promise<Supplier[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("company_name");
  if (error) throw new Error(`Failed to load suppliers: ${error.message}`);
  return data;
}

export async function getCustomers(): Promise<Customer[]> {
  const supabase = createAdminClient();
  let { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("full_name");

  if (error && error.message.toLowerCase().includes("full_name")) {
    ({ data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false }));
  }

  if (error) throw new Error(`Failed to load customers: ${error.message}`);
  return (data ?? []).map((row) =>
    normalizeCustomer(row as Record<string, unknown>)
  );
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load product: ${error.message}`);
  return data;
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load supplier: ${error.message}`);
  return data;
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load customer: ${error.message}`);
  return data ? normalizeCustomer(data as Record<string, unknown>) : null;
}

export const getUserById = cache(async (id: string): Promise<User | null> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load user: ${error.message}`);
  return data;
});

export const getUserByEmail = cache(async (email: string): Promise<User | null> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .ilike("email", email.trim())
    .maybeSingle();
  if (error) throw new Error(`Failed to load user: ${error.message}`);
  return data;
});

export async function getExpiringBatches(
  limit: number
): Promise<BatchWithProduct[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("product_batches")
    .select(
      "*, products(product_name, sku, unit, selling_price), suppliers(company_name)"
    )
    .gt("quantity_remaining", 0)
    .not("expiry_date", "is", null)
    .order("expiry_date", { ascending: true })
    .limit(Math.max(limit * 4, 24));

  if (error) throw new Error(`Failed to load expiring batches: ${error.message}`);

  return (data as unknown as BatchWithProduct[])
    .filter((b) => b.expiry_date && expiryStatus(b.expiry_date) !== "ok")
    .slice(0, limit);
}

export async function getBatches(): Promise<BatchWithProduct[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("product_batches")
    .select(
      "*, products(product_name, sku, unit, selling_price), suppliers(company_name)"
    )
    .order("expiry_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Failed to load batches: ${error.message}`);
  return data as unknown as BatchWithProduct[];
}

export async function getTransactions(
  limit = 100
): Promise<TransactionWithProduct[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("*, products(product_name, sku, unit), product_batches(batch_number)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load transactions: ${error.message}`);
  return data as unknown as TransactionWithProduct[];
}

export async function getProductByCode(code: string) {
  const supabase = createAdminClient();
  const trimmed = code.trim();
  const select = "*, categories(name)";

  const { data, error } = await supabase
    .from("products")
    .select(select)
    .or(`sku.eq.${trimmed},barcode.eq.${trimmed}`)
    .limit(1);

  if (error) throw new Error(`Failed to load product: ${error.message}`);
  return data?.[0] ?? null;
}

export async function getBranches() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("branches")
    .select("*")
    .order("name");
  if (error) throw new Error(`Failed to load branches: ${error.message}`);
  return data;
}

export async function getStockTransfers() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("stock_transfers")
    .select("*, from_branch_info:branches!stock_transfers_from_branch_fkey(name), to_branch_info:branches!stock_transfers_to_branch_fkey(name)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    const fallback = await supabase
      .from("stock_transfers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (fallback.error)
      throw new Error(`Failed to load transfers: ${fallback.error.message}`);
    return fallback.data;
  }
  return data;
}

export async function getPurchaseOrders() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select(
      "*, suppliers(company_name), purchase_order_items(*, products(product_name, sku, unit))"
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`Failed to load orders: ${error.message}`);
  return data as PurchaseOrder[];
}

export async function getPrescriptions() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("prescriptions")
    .select("*")
    .order("uploaded_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(`Failed to load prescriptions: ${error.message}`);
  return data;
}

export async function getBranchStockSummary() {
  const supabase = createAdminClient();
  const [branches, transactions, products] = await Promise.all([
    getBranches(),
    supabase
      .from("inventory_transactions")
      .select("branch_id, product_id, transaction_type, quantity")
      .order("created_at", { ascending: false })
      .limit(10000),
    supabase.from("products").select("id, product_name, sku"),
  ]);

  const stockByBranch = new Map<string, Map<string, number>>();

  for (const tx of transactions.data ?? []) {
    const branchId = tx.branch_id ?? "unassigned";
    if (!stockByBranch.has(branchId)) stockByBranch.set(branchId, new Map());
    const branchStock = stockByBranch.get(branchId)!;
    const pid = tx.product_id ?? "";
    const qty = tx.quantity ?? 0;
    const isIn = tx.transaction_type.toLowerCase().includes("in");
    branchStock.set(pid, (branchStock.get(pid) ?? 0) + (isIn ? qty : -qty));
  }

  return branches.map((branch) => {
    const stock = stockByBranch.get(branch.id) ?? new Map();
    const items = [...stock.entries()]
      .filter(([, q]) => q > 0)
      .map(([productId, qty]) => {
        const product = products.data?.find((p) => p.id === productId);
        return {
          product_name: product?.product_name ?? "Unknown",
          sku: product?.sku ?? "—",
          quantity: qty,
        };
      });
    return { branch, total_skus: items.length, items: items.slice(0, 5) };
  });
}

export async function getSales(limit = 100): Promise<SaleWithItems[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sales")
    .select("*, sale_items(*, products(product_name, sku, unit))")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load sales: ${error.message}`);
  return data as unknown as SaleWithItems[];
}

export async function getSaleById(id: string): Promise<SaleWithItems | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sales")
    .select("*, sale_items(*, products(product_name, sku, unit))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load sale: ${error.message}`);
  return data as unknown as SaleWithItems | null;
}

export async function getSaleByInvoice(
  invoiceNumber: string
): Promise<SaleWithItems | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sales")
    .select("*, sale_items(*, products(product_name, sku, unit))")
    .eq("invoice_number", invoiceNumber)
    .maybeSingle();
  if (error) throw new Error(`Failed to load sale: ${error.message}`);
  return data as unknown as SaleWithItems | null;
}

export async function getSalesReportSummary(): Promise<SalesReportSummary> {
  const { summary } = await getSalesMetrics();
  return summary;
}

export async function getUsers(): Promise<User[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("full_name");
  if (error) throw new Error(`Failed to load users: ${error.message}`);
  return data;
}

export async function getNotifications(limit = 15): Promise<Notification[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load notifications: ${error.message}`);
  return data;
}
