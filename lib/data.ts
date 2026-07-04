import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BatchWithProduct,
  Category,
  Product,
  ProductWithStock,
  Supplier,
  TransactionWithProduct,
  PurchaseOrder,
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

export async function getProductsWithStock(): Promise<ProductWithStock[]> {
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
}

export async function getSuppliers(): Promise<Supplier[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("company_name");
  if (error) throw new Error(`Failed to load suppliers: ${error.message}`);
  return data;
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

  const { data: bySku } = await supabase
    .from("products")
    .select(select)
    .eq("sku", trimmed)
    .maybeSingle();
  if (bySku) return bySku;

  const { data: byBarcode } = await supabase
    .from("products")
    .select(select)
    .eq("barcode", trimmed)
    .maybeSingle();
  return byBarcode;
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
      .select("branch_id, product_id, transaction_type, quantity"),
    supabase.from("products").select("id, product_name, sku").limit(100),
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
