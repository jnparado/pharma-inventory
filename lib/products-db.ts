import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductInventoryLine } from "@/lib/types";

export type ProductEntryInput = {
  entry_date: string;
  product_name: string;
  brand: string;
  quantity: number;
  lot_number: string;
  expiry_date: string | null;
  cost: number;
  selling_price_ws: number;
  selling_price_retail: number;
};

type BatchRow = {
  id: string;
  product_id: string | null;
  batch_number: string;
  expiry_date: string | null;
  quantity_remaining: number | null;
  purchase_price: number | null;
  received_date?: string | null;
  created_at: string | null;
  products: unknown;
};

const REGISTER_COLUMN_CANDIDATES = [
  "product_name",
  "lot_number",
  "brand",
  "brand_name",
  "quantity",
  "expiry_date",
  "exp_date",
  "cost",
  "purchase_price",
  "selling_price_ws",
  "selling_price_retail",
  "selling_price",
  "price",
  "entry_date",
  "received_date",
] as const;

const INVENTORY_SELECTS = [
  "id, product_id, batch_number, expiry_date, quantity_remaining, purchase_price, received_date, created_at, products(product_name, brand_name, selling_price, selling_price_ws)",
  "id, product_id, batch_number, expiry_date, quantity_remaining, purchase_price, created_at, products(product_name, brand_name, selling_price, selling_price_ws)",
  "id, product_id, batch_number, expiry_date, quantity_remaining, purchase_price, created_at, products(product_name, brand_name, selling_price)",
  "id, product_id, batch_number, expiry_date, quantity_remaining, purchase_price, created_at, products(product_name, selling_price)",
] as const;

let cachedProductColumns: Set<string> | null = null;
let cachedFlatRegister: boolean | null = null;

function missingColumn(message: string, column: string): boolean {
  const lower = message.toLowerCase();
  const col = column.toLowerCase();
  return (
    lower.includes(col) &&
    (lower.includes("column") ||
      lower.includes("schema cache") ||
      lower.includes("does not exist"))
  );
}

function buildRegisterPayload(
  input: ProductEntryInput
): Record<string, string | number | null> {
  const brand = input.brand.trim() || null;
  return {
    product_name: input.product_name.trim(),
    lot_number: input.lot_number.trim(),
    brand,
    brand_name: brand,
    quantity: input.quantity,
    expiry_date: input.expiry_date,
    exp_date: input.expiry_date,
    cost: input.cost,
    purchase_price: input.cost,
    selling_price_ws: input.selling_price_ws,
    selling_price_retail: input.selling_price_retail,
    selling_price: input.selling_price_retail,
    price: input.selling_price_retail,
    entry_date: input.entry_date,
    received_date: input.entry_date,
  };
}

function mapProductRow(r: Record<string, unknown>): ProductInventoryLine {
  const cost = r.cost ?? r.purchase_price;
  const retail = r.selling_price_retail ?? r.selling_price ?? r.price;
  const ws = r.selling_price_ws;

  return {
    batch_id: String(r.id),
    product_id: String(r.id),
    entry_date:
      (r.entry_date as string | null) ??
      (r.received_date as string | null) ??
      (r.created_at as string | null)?.toString().slice(0, 10) ??
      null,
    product_name: String(r.product_name ?? r.name ?? "Unknown"),
    brand: (r.brand as string | null) ?? (r.brand_name as string | null) ?? null,
    quantity: Number(r.quantity ?? r.qty ?? 0),
    lot_number: String(r.lot_number ?? r.batch_number ?? "—"),
    expiry_date:
      (r.expiry_date as string | null) ?? (r.exp_date as string | null) ?? null,
    cost: cost != null && cost !== "" ? Number(cost) : null,
    selling_price_ws: ws != null && ws !== "" ? Number(ws) : null,
    selling_price_retail: Number(retail ?? 0),
  };
}

async function getProductColumns(
  supabase: SupabaseClient
): Promise<Set<string>> {
  if (cachedProductColumns) return cachedProductColumns;

  const { data, error } = await supabase.from("products").select("*").limit(1);
  if (!error && data?.[0]) {
    cachedProductColumns = new Set(Object.keys(data[0]));
    return cachedProductColumns;
  }

  cachedProductColumns = new Set(REGISTER_COLUMN_CANDIDATES);
  return cachedProductColumns;
}

async function isFlatRegister(supabase: SupabaseClient): Promise<boolean> {
  if (cachedFlatRegister !== null) return cachedFlatRegister;
  const cols = await getProductColumns(supabase);
  cachedFlatRegister = cols.has("lot_number") && cols.has("quantity");
  return cachedFlatRegister;
}

function pickKnownColumns(
  payload: Record<string, string | number | null>,
  columns: Set<string>
): Record<string, string | number | null> {
  const row: Record<string, string | number | null> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (columns.has(key)) row[key] = value;
  }
  return row;
}

/** Single round-trip write; strips unknown columns from cache on schema errors. */
async function writeProductsRow(
  supabase: SupabaseClient,
  payload: Record<string, string | number | null>,
  productId?: string
): Promise<{ id: string | null; error: string | null }> {
  let columns = await getProductColumns(supabase);
  let row = pickKnownColumns(payload, columns);

  for (let attempt = 0; attempt < 3; attempt++) {
    if (Object.keys(row).length === 0) {
      return { id: null, error: "Could not save product" };
    }

    const result = productId
      ? await supabase
          .from("products")
          .update(row)
          .eq("id", productId)
          .select("id")
          .single()
      : await supabase.from("products").insert(row).select("id").single();

    if (!result.error && result.data) {
      return { id: productId ?? String(result.data.id), error: null };
    }

    if (!result.error) {
      return { id: productId ?? null, error: "Could not save product" };
    }

    const badKeys = Object.keys(row).filter((key) =>
      missingColumn(result.error!.message, key)
    );
    if (badKeys.length === 0) {
      return { id: null, error: result.error.message };
    }

    for (const key of badKeys) {
      delete row[key];
      columns.delete(key);
    }
    cachedProductColumns = columns;
  }

  return { id: null, error: "Could not save product" };
}

function parseProductJoin(value: unknown) {
  const product = value as {
    product_name?: string;
    brand_name?: string | null;
    selling_price?: number;
    selling_price_ws?: number | null;
  } | null;

  return {
    product_name: product?.product_name ?? "Unknown",
    brand: product?.brand_name ?? null,
    selling_price_ws: product?.selling_price_ws ?? null,
    selling_price_retail: Number(product?.selling_price ?? 0),
  };
}

export function mapBatchRowToInventoryLine(row: BatchRow): ProductInventoryLine {
  const product = parseProductJoin(row.products);

  return {
    batch_id: row.id,
    product_id: row.product_id ?? "",
    entry_date: row.received_date ?? row.created_at?.slice(0, 10) ?? null,
    product_name: product.product_name,
    brand: product.brand,
    quantity: row.quantity_remaining ?? 0,
    lot_number: row.batch_number,
    expiry_date: row.expiry_date,
    cost: row.purchase_price,
    selling_price_ws: product.selling_price_ws,
    selling_price_retail: product.selling_price_retail,
  };
}

export async function fetchProductInventoryRows(
  supabase: SupabaseClient,
  batchId?: string
): Promise<ProductInventoryLine[]> {
  if (await isFlatRegister(supabase)) {
    return fetchFromProductsOnly(supabase, batchId);
  }

  const fromProducts = await fetchFromProductsOnly(supabase, batchId);
  if (fromProducts.length > 0 || batchId) {
    return fromProducts;
  }

  try {
    const batchRows = await fetchFromBatches(supabase);
    if (batchRows.length > 0) return batchRows;
  } catch {
    // use empty products result
  }

  return fromProducts;
}

async function fetchFromBatches(
  supabase: SupabaseClient,
  batchId?: string
): Promise<ProductInventoryLine[]> {
  let lastError = "Could not load product inventory";

  for (const select of INVENTORY_SELECTS) {
    let query = supabase
      .from("product_batches")
      .select(select)
      .order("created_at", { ascending: false });

    if (batchId) {
      query = query.eq("id", batchId);
    }

    const { data, error } = await query;
    if (!error) {
      return ((data ?? []) as unknown as BatchRow[]).map(mapBatchRowToInventoryLine);
    }

    lastError = error.message;
  }

  throw new Error(`Failed to load product inventory: ${lastError}`);
}

async function fetchFromProductsOnly(
  supabase: SupabaseClient,
  productId?: string
): Promise<ProductInventoryLine[]> {
  let query = supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (productId) {
    query = query.eq("id", productId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load products: ${error.message}`);
  }

  return (data ?? []).map((row) =>
    mapProductRow(row as unknown as Record<string, unknown>)
  );
}

async function insertProductRow(
  supabase: SupabaseClient,
  input: ProductEntryInput
): Promise<{ productId: string | null; error: string | null }> {
  const created = await writeProductsRow(supabase, buildRegisterPayload(input));
  return { productId: created.id, error: created.error };
}

function buildBatchInsertRows(
  productId: string,
  input: ProductEntryInput
): Record<string, string | number | null>[] {
  const lot = input.lot_number.trim();
  const qty = input.quantity;

  return [
    {
      product_id: productId,
      batch_number: lot,
      quantity_remaining: qty,
    },
    {
      product_id: productId,
      batch_number: lot,
      quantity_received: qty,
      quantity_remaining: qty,
      purchase_price: input.cost,
      expiry_date: input.expiry_date,
    },
  ];
}

function buildBatchUpdateRows(
  input: ProductEntryInput
): Record<string, string | number | null>[] {
  return [
    {
      batch_number: input.lot_number.trim(),
      expiry_date: input.expiry_date,
      quantity_received: input.quantity,
      quantity_remaining: input.quantity,
      purchase_price: input.cost,
    },
  ];
}

export async function insertProductEntry(
  supabase: SupabaseClient,
  input: ProductEntryInput
): Promise<{ error: string | null; productId?: string; batchId?: string }> {
  const { productId, error: productError } = await insertProductRow(
    supabase,
    input
  );
  if (!productId) return { error: productError ?? "Could not save product" };

  if (await isFlatRegister(supabase)) {
    return { error: null, productId, batchId: productId };
  }

  let batchId: string | null = null;
  let lastBatchError = "Could not save batch";

  for (const row of buildBatchInsertRows(productId, input)) {
    const { data, error } = await supabase
      .from("product_batches")
      .insert(row)
      .select("id")
      .single();

    if (!error && data) {
      batchId = data.id;
      break;
    }

    lastBatchError = error?.message ?? lastBatchError;
    const isSchemaError =
      error &&
      Object.keys(row).some((key) => missingColumn(error.message, key));
    if (!isSchemaError) break;
  }

  if (!batchId) {
    return { error: null, productId };
  }

  void supabase.from("inventory_transactions").insert({
    product_id: productId,
    batch_id: batchId,
    transaction_type: "stock_in",
    quantity: input.quantity,
    reference_no: `Entry ${input.lot_number.trim()}`,
  });

  return { error: null, productId, batchId };
}

export async function updateProductEntry(
  supabase: SupabaseClient,
  batchId: string,
  productId: string,
  input: ProductEntryInput
): Promise<{ error: string | null }> {
  const updated = await writeProductsRow(
    supabase,
    buildRegisterPayload(input),
    productId
  );
  if (updated.error) {
    return { error: updated.error };
  }

  if (await isFlatRegister(supabase)) {
    return { error: null };
  }

  for (const row of buildBatchUpdateRows(input)) {
    const { error } = await supabase
      .from("product_batches")
      .update(row)
      .eq("id", batchId);
    if (!error) return { error: null };
    const isSchemaError = Object.keys(row).some((key) =>
      missingColumn(error.message, key)
    );
    if (!isSchemaError) break;
  }

  return { error: null };
}

export async function deleteProductEntry(
  supabase: SupabaseClient,
  productId: string,
  batchId: string
): Promise<{ error: string | null }> {
  if (await isFlatRegister(supabase)) {
    const { error } = await supabase.from("products").delete().eq("id", productId);
    return { error: error?.message ?? null };
  }

  const { error: batchError } = await supabase
    .from("product_batches")
    .delete()
    .eq("id", batchId);
  if (batchError) {
    return { error: batchError.message };
  }

  const { count } = await supabase
    .from("product_batches")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  if ((count ?? 0) === 0) {
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) return { error: error.message };
  }

  return { error: null };
}

export function parseProductEntryBody(body: Record<string, unknown>) {
  const quantity = Number(body.quantity);
  return {
    entry_date:
      String(body.entry_date ?? "").trim() ||
      new Date().toISOString().slice(0, 10),
    product_name: String(body.product_name ?? "").trim(),
    brand: String(body.brand ?? "").trim(),
    quantity,
    lot_number: String(body.lot_number ?? "").trim(),
    expiry_date: String(body.expiry_date ?? "").trim() || null,
    cost: Number(body.cost ?? 0),
    selling_price_ws: Number(body.selling_price_ws ?? 0),
    selling_price_retail: Number(body.selling_price_retail ?? 0),
  } satisfies ProductEntryInput;
}

export function validateProductEntry(input: ProductEntryInput): string | null {
  if (!input.product_name || !input.lot_number) {
    return "Product name and lot number are required";
  }
  if (!input.brand) {
    return "Brand is required";
  }
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    return "Enter a valid whole-number quantity";
  }
  return null;
}
