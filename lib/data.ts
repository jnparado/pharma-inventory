import { cache } from "react";
import { fetchCustomers, fetchCustomerById } from "@/lib/customers-db";
import { fetchProductInventoryRows, isFlatRegister } from "@/lib/products-db";
import { isSupabaseConfigured } from "@/lib/env";
import { getSalesMetrics } from "@/lib/sales-metrics";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BATCH_WITH_PRODUCT_SELECTS,
  isSchemaError,
  normalizeBatchRows,
  normalizeJoinedProduct,
  PURCHASE_ORDER_SELECTS,
  SALE_DETAIL_SELECTS,
  SALE_WITH_ITEMS_SELECTS,
  TRANSACTION_SELECTS,
} from "@/lib/supabase/schema-fallback";
import { expiryStatus } from "@/lib/utils";
import type {
  BatchWithProduct,
  Category,
  Product,
  ProductInventoryLine,
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
  try {
    const supabase = createAdminClient();
    let productsRes = await supabase
      .from("products")
      .select("*, categories(name)")
      .order("product_name");

    if (productsRes.error) {
      productsRes = await supabase
        .from("products")
        .select("*")
        .order("product_name");
    }
    if (productsRes.error) {
      console.error("Failed to load products:", productsRes.error.message);
      return [];
    }

    const batchesRes = await supabase
      .from("product_batches")
      .select("product_id, quantity_remaining, expiry_date");

    const stockByProduct = new Map<
      string,
      { total: number; nearestExpiry: string | null }
    >();

    if (!batchesRes.error) {
      for (const batch of batchesRes.data ?? []) {
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
    }

    return (productsRes.data as unknown as ProductWithStock[]).map((product) => {
      const batchStock = stockByProduct.get(product.id);
      const flatQty = Number(
        (product as ProductWithStock & { quantity?: number }).quantity ?? 0
      );
      const entry = batchStock ?? {
        total: flatQty,
        nearestExpiry:
          (product as ProductWithStock & { expiry_date?: string | null })
            .expiry_date ??
          (product as ProductWithStock & { exp_date?: string | null }).exp_date ??
          null,
      };
      return {
        ...product,
        total_stock: entry.total,
        nearest_expiry: entry.nearestExpiry,
      };
    });
  } catch (e) {
    console.error("getProductsWithStock:", e);
    return [];
  }
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
  return fetchCustomers(supabase);
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

export async function getProductInventoryLines(): Promise<ProductInventoryLine[]> {
  const supabase = createAdminClient();
  return fetchProductInventoryRows(supabase);
}

export async function getProductInventoryLineByBatchId(
  batchId: string
): Promise<ProductInventoryLine | null> {
  const supabase = createAdminClient();
  const lines = await fetchProductInventoryRows(supabase, batchId);
  return lines[0] ?? null;
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
  return fetchCustomerById(supabase, id);
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

function mapFlatProductToBatch(
  row: Record<string, unknown>
): BatchWithProduct | null {
  const expiry =
    (row.expiry_date as string | null) ?? (row.exp_date as string | null);
  if (!expiry) return null;

  const qty = Number(row.quantity ?? 0);
  const supplierName =
    (row.supplier_name as string | null)?.trim() ||
    (row.suppliers as { company_name?: string } | null)?.company_name?.trim() ||
    (typeof row.supplier === "object" &&
    row.supplier !== null &&
    !Array.isArray(row.supplier)
      ? (row.supplier as { company_name?: string }).company_name?.trim()
      : null) ||
    null;

  return {
    id: String(row.id),
    product_id: String(row.id),
    supplier_id:
      (row.supplier_id as string | null) ??
      (typeof row.supplier === "string" ? row.supplier : null),
    batch_number: String(row.lot_number ?? row.batch_number ?? "—"),
    manufacture_date: null,
    expiry_date: String(expiry).slice(0, 10),
    purchase_price: row.cost != null ? Number(row.cost) : null,
    quantity_received: qty,
    quantity_remaining: qty,
    created_at: (row.created_at as string | null) ?? null,
    products: normalizeJoinedProduct(row),
    suppliers: supplierName ? { company_name: supplierName } : null,
  };
}

async function getBatchesFromFlatProducts(
  supabase: ReturnType<typeof createAdminClient>
): Promise<BatchWithProduct[]> {
  for (const select of [
    "*, supplier:suppliers(company_name)",
    "*, suppliers(company_name)",
    "*",
  ] as const) {
    const { data, error } = await supabase.from("products").select(select);
    if (error) {
      if (select.includes("suppliers")) continue;
      return [];
    }

    return ((data ?? []) as unknown as Record<string, unknown>[])
      .map(mapFlatProductToBatch)
      .filter((b): b is BatchWithProduct => b !== null)
      .sort((a, b) =>
        (a.expiry_date ?? "") < (b.expiry_date ?? "") ? -1 : 1
      );
  }

  return [];
}

async function getBatchesFromProductBatchesTable(
  supabase: ReturnType<typeof createAdminClient>
): Promise<BatchWithProduct[] | null> {
  for (const select of BATCH_WITH_PRODUCT_SELECTS) {
    const { data, error } = await supabase
      .from("product_batches")
      .select(select)
      .order("expiry_date", { ascending: true, nullsFirst: false });

    if (!error) return normalizeBatchRows(data ?? []);
    if (!isSchemaError(error.message)) return null;
  }
  return null;
}

export async function getExpiringBatches(
  limit: number
): Promise<BatchWithProduct[]> {
  const supabase = createAdminClient();

  if (await isFlatRegister(supabase)) {
    return filterExpiringBatches(await getBatchesFromFlatProducts(supabase), limit);
  }

  const batchLimit = Math.max(limit * 4, 24);
  for (const select of BATCH_WITH_PRODUCT_SELECTS) {
    const { data, error } = await supabase
      .from("product_batches")
      .select(select)
      .gt("quantity_remaining", 0)
      .not("expiry_date", "is", null)
      .order("expiry_date", { ascending: true })
      .limit(batchLimit);

    if (!error) {
      const rows = normalizeBatchRows(data ?? []);
      if (rows.length > 0) {
        return filterExpiringBatches(rows, limit);
      }
      break;
    }

    if (!isSchemaError(error.message)) break;
  }

  return filterExpiringBatches(await getBatchesFromFlatProducts(supabase), limit);
}

function filterExpiringBatches(
  batches: BatchWithProduct[],
  limit?: number
): BatchWithProduct[] {
  const expiring = batches
    .filter(
      (b) =>
        (b.quantity_remaining ?? 0) > 0 &&
        b.expiry_date &&
        expiryStatus(b.expiry_date) !== "ok"
    )
    .sort((a, b) =>
      (a.expiry_date ?? "") < (b.expiry_date ?? "") ? -1 : 1
    );

  return limit ? expiring.slice(0, limit) : expiring;
}

export async function getBatches(): Promise<BatchWithProduct[]> {
  const supabase = createAdminClient();

  if (await isFlatRegister(supabase)) {
    return getBatchesFromFlatProducts(supabase);
  }

  const fromBatches = await getBatchesFromProductBatchesTable(supabase);
  if (fromBatches && fromBatches.length > 0) {
    return fromBatches;
  }

  return getBatchesFromFlatProducts(supabase);
}

export async function getTransactions(
  limit = 100
): Promise<TransactionWithProduct[]> {
  const supabase = createAdminClient();

  for (const select of TRANSACTION_SELECTS) {
    const { data, error } = await supabase
      .from("inventory_transactions")
      .select(select)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error) {
      return (data ?? []).map((row) => {
        const tx = row as unknown as TransactionWithProduct & {
          products?: Record<string, unknown> | null;
        };
        const normalized = normalizeJoinedProduct(tx.products ?? null);
        if (normalized) {
          tx.products = {
            product_name: normalized.product_name,
            sku: normalized.sku,
            unit: normalized.unit,
          };
        }
        return tx as TransactionWithProduct;
      });
    }

    if (!isSchemaError(error.message)) break;
  }

  return [];
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

  for (const select of PURCHASE_ORDER_SELECTS) {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select(select)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error) return data as unknown as PurchaseOrder[];
    if (!isSchemaError(error.message)) break;
  }

  return [];
}

export async function getPurchaseOrderById(
  id: string
): Promise<PurchaseOrder | null> {
  const supabase = createAdminClient();

  for (const select of PURCHASE_ORDER_SELECTS) {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select(select)
      .eq("id", id)
      .maybeSingle();

    if (!error && data) return data as unknown as PurchaseOrder;
    if (error && !isSchemaError(error.message)) break;
  }

  return null;
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

  for (const select of SALE_DETAIL_SELECTS) {
    const { data, error } = await supabase
      .from("sales")
      .select(select)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error) return data as unknown as SaleWithItems[];
    if (!isSchemaError(error.message)) break;
  }

  return [];
}

export async function getSaleById(id: string): Promise<SaleWithItems | null> {
  const supabase = createAdminClient();

  for (const select of SALE_DETAIL_SELECTS) {
    const { data, error } = await supabase
      .from("sales")
      .select(select)
      .eq("id", id)
      .maybeSingle();

    if (!error) return data as unknown as SaleWithItems | null;
    if (!isSchemaError(error.message)) break;
  }

  return null;
}

export async function getSaleByInvoice(
  invoiceNumber: string
): Promise<SaleWithItems | null> {
  const supabase = createAdminClient();

  for (const select of SALE_DETAIL_SELECTS) {
    const { data, error } = await supabase
      .from("sales")
      .select(select)
      .eq("invoice_number", invoiceNumber)
      .maybeSingle();

    if (!error) return data as unknown as SaleWithItems | null;
    if (!isSchemaError(error.message)) break;
  }

  return null;
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
  if (error) {
    console.error("Failed to load notifications:", error.message);
    return [];
  }
  return data;
}
