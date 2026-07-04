import { isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BatchWithProduct,
  Category,
  Product,
  ProductWithStock,
  Supplier,
  TransactionWithProduct,
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
