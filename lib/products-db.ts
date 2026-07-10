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

const INVENTORY_SELECTS = [
  "id, product_id, batch_number, expiry_date, quantity_remaining, purchase_price, received_date, created_at, products(product_name, brand_name, selling_price, selling_price_ws)",
  "id, product_id, batch_number, expiry_date, quantity_remaining, purchase_price, created_at, products(product_name, brand_name, selling_price, selling_price_ws)",
  "id, product_id, batch_number, expiry_date, quantity_remaining, purchase_price, received_date, created_at, products(product_name, brand_name, selling_price)",
  "id, product_id, batch_number, expiry_date, quantity_remaining, purchase_price, created_at, products(product_name, brand_name, selling_price)",
  "id, product_id, batch_number, expiry_date, quantity_remaining, purchase_price, created_at, products(product_name, selling_price)",
] as const;

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

function notNullViolation(message: string, column: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("not-null") &&
    lower.includes(column.toLowerCase())
  );
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
  try {
    const batchRows = await fetchFromBatches(supabase, batchId);
    if (batchRows.length > 0 || batchId) {
      return batchRows;
    }
  } catch {
    // Fall back to flat products table below.
  }

  return fetchFromProductsOnly(supabase, batchId);
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

  if (batchId) return [];

  throw new Error(`Failed to load product inventory: ${lastError}`);
}

async function fetchFromProductsOnly(
  supabase: SupabaseClient,
  productId?: string
): Promise<ProductInventoryLine[]> {
  const selects = [
    "id, product_name, brand_name, brand, lot_number, quantity, qty, expiry_date, exp_date, cost, purchase_price, selling_price_ws, selling_price_retail, selling_price, price, entry_date, received_date, created_at",
    "id, product_name, brand_name, lot_number, quantity, expiry_date, cost, selling_price_retail, selling_price, entry_date, created_at",
    "id, product_name, brand_name, quantity, selling_price, created_at",
    "id, product_name, created_at",
  ];

  for (const select of selects) {
    let query = supabase.from("products").select(select).order("created_at", {
      ascending: false,
    });
    if (productId) {
      query = query.eq("id", productId);
    }

    const { data, error } = await query;
    if (error) continue;

    return (data ?? []).map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        batch_id: String(r.id),
        product_id: String(r.id),
        entry_date:
          (r.entry_date as string | null) ??
          (r.received_date as string | null) ??
          (r.created_at as string | null)?.slice(0, 10) ??
          null,
        product_name: String(r.product_name ?? "Unknown"),
        brand: (r.brand_name as string | null) ?? (r.brand as string | null) ?? null,
        quantity: Number(r.quantity ?? r.qty ?? 0),
        lot_number: String(r.lot_number ?? "—"),
        expiry_date:
          (r.expiry_date as string | null) ?? (r.exp_date as string | null) ?? null,
        cost: Number(r.cost ?? r.purchase_price ?? 0) || null,
        selling_price_ws: Number(r.selling_price_ws ?? 0) || null,
        selling_price_retail: Number(
          r.selling_price_retail ?? r.selling_price ?? r.price ?? 0
        ),
      };
    });
  }

  return [];
}

function skuFromLot(lotNumber: string): string {
  const cleaned = lotNumber.trim().replace(/\s+/g, "-").toUpperCase();
  const base = cleaned.startsWith("LOT-") ? cleaned : `LOT-${cleaned}`;
  return `${base}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

async function resolveCategoryId(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data: general } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", "General")
    .maybeSingle();
  if (general?.id) return general.id;

  const { data: anyCategory } = await supabase
    .from("categories")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (anyCategory?.id) return anyCategory.id;

  const { data: created } = await supabase
    .from("categories")
    .insert({ name: "General" })
    .select("id")
    .single();

  return created?.id ?? null;
}

function buildProductInsertRows(
  input: ProductEntryInput,
  categoryId: string | null
): Record<string, string | number | null>[] {
  const name = input.product_name.trim();
  const sku = skuFromLot(input.lot_number);
  const lot = input.lot_number.trim();
  const price = input.selling_price_retail;
  const brand = input.brand.trim() || null;
  const qty = input.quantity;

  const flat: Record<string, string | number | null> = {
    product_name: name,
    brand_name: brand,
    brand,
    lot_number: lot,
    quantity: qty,
    qty,
    expiry_date: input.expiry_date,
    exp_date: input.expiry_date,
    cost: input.cost,
    purchase_price: input.cost,
    selling_price_ws: input.selling_price_ws,
    selling_price_retail: price,
    selling_price: price,
    price,
    entry_date: input.entry_date,
    received_date: input.entry_date,
    unit: "pcs",
    ...(categoryId ? { category_id: categoryId } : {}),
  };

  const rows: Record<string, string | number | null>[] = [flat];

  const optionalGroups = [
    { sku },
    { selling_price: price },
    { selling_price_retail: price },
    { retail_price: price },
    { unit: "pcs", selling_price: price },
    { unit: "pcs", selling_price_retail: price },
    {
      product_name: name,
      brand_name: brand,
      lot_number: lot,
      quantity: qty,
      selling_price_retail: price,
    },
    { product_name: name, brand_name: brand, selling_price_retail: price },
    { product_name: name, selling_price_retail: price },
    { product_name: name, brand_name: brand, sku, selling_price: price },
  ];

  for (const extra of optionalGroups) {
    const withLot = {
      product_name: name,
      brand_name: brand,
      lot_number: lot,
      ...extra,
    } as unknown as Record<string, string | number | null>;
    rows.push({
      ...withLot,
      ...(categoryId ? { category_id: categoryId } : {}),
    });
    rows.push(withLot);
  }

  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function friendlyProductError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("category_id") || lower.includes("categories")) {
    return "Database setup needed: run supabase/products.sql in Supabase SQL Editor, then try again.";
  }
  if (lower.includes("duplicate key") && lower.includes("sku")) {
    return "This lot number was already used. Enter a different lot number.";
  }
  return message;
}

async function insertProductRow(
  supabase: SupabaseClient,
  input: ProductEntryInput
): Promise<{ productId: string | null; error: string | null }> {
  let categoryId: string | null = await resolveCategoryId(supabase);
  let lastError = "Could not save product";

  for (let attempt = 0; attempt < 3; attempt++) {
    const rows = buildProductInsertRows(input, categoryId);

    for (const row of rows) {
      const { data, error } = await supabase
        .from("products")
        .insert(row)
        .select("id")
        .single();

      if (!error && data) {
        return { productId: data.id, error: null };
      }

      lastError = error?.message ?? lastError;
      if (!error) continue;

      if (notNullViolation(error.message, "category_id") && !categoryId) {
        categoryId = await resolveCategoryId(supabase);
        break;
      }

      if (notNullViolation(error.message, "category_id") && categoryId) {
        continue;
      }

      if (
        notNullViolation(error.message, "lot_number") ||
        notNullViolation(error.message, "product_name") ||
        notNullViolation(error.message, "brand_name")
      ) {
        continue;
      }

      const isSchemaError = Object.keys(row).some((key) =>
        missingColumn(error.message, key)
      );
      if (!isSchemaError) {
        return { productId: null, error: friendlyProductError(lastError) };
      }
    }

    if (categoryId) continue;
    break;
  }

  return { productId: null, error: friendlyProductError(lastError) };
}

function buildBatchInsertRows(
  productId: string,
  input: ProductEntryInput
): Record<string, string | number | null>[] {
  const lot = input.lot_number.trim();
  const qty = input.quantity;

  const rows: Record<string, string | number | null>[] = [
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
    },
    {
      product_id: productId,
      batch_number: lot,
      quantity_received: qty,
      quantity_remaining: qty,
      purchase_price: input.cost,
      expiry_date: input.expiry_date,
    },
    {
      product_id: productId,
      batch_number: lot,
      quantity_received: qty,
      quantity_remaining: qty,
      purchase_price: input.cost,
      expiry_date: input.expiry_date,
      received_date: input.entry_date,
    },
  ];

  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildBatchUpdateRows(
  input: ProductEntryInput
): Record<string, string | number | null>[] {
  const base = {
    batch_number: input.lot_number.trim(),
    expiry_date: input.expiry_date,
    quantity_received: input.quantity,
    quantity_remaining: input.quantity,
    purchase_price: input.cost,
  };

  return [base, { ...base, received_date: input.entry_date }];
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

  const flatOnly =
    (await supabase.from("product_batches").select("id").limit(1)).error !== null;

  if (flatOnly) {
    return { error: null, productId };
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
    if (!isSchemaError) {
      await supabase.from("products").delete().eq("id", productId);
      return { error: lastBatchError };
    }
  }

  if (!batchId) {
    await supabase.from("products").delete().eq("id", productId);
    return { error: lastBatchError };
  }

  const { error: txError } = await supabase
    .from("inventory_transactions")
    .insert({
      product_id: productId,
      batch_id: batchId,
      transaction_type: "stock_in",
      quantity: input.quantity,
      reference_no: `Entry ${input.lot_number.trim()}`,
    });

  if (txError) {
    const { error: txFallbackError } = await supabase
      .from("inventory_transactions")
      .insert({
        product_id: productId,
        batch_id: batchId,
        transaction_type: "stock_in",
        quantity: input.quantity,
      });

    if (txFallbackError) {
      await supabase.from("product_batches").delete().eq("id", batchId);
      await supabase.from("products").delete().eq("id", productId);
      return { error: txFallbackError.message };
    }
  }

  return { error: null, productId, batchId };
}

export async function updateProductEntry(
  supabase: SupabaseClient,
  batchId: string,
  productId: string,
  input: ProductEntryInput
): Promise<{ error: string | null }> {
  const productUpdates = [
    {
      product_name: input.product_name.trim(),
      brand_name: input.brand.trim() || null,
      selling_price: input.selling_price_retail,
      selling_price_ws: input.selling_price_ws,
    },
    {
      product_name: input.product_name.trim(),
      brand_name: input.brand.trim() || null,
      selling_price: input.selling_price_retail,
    },
    {
      product_name: input.product_name.trim(),
      selling_price: input.selling_price_retail,
    },
  ];

  let productError: string | null = null;
  for (const row of productUpdates) {
    const { error } = await supabase
      .from("products")
      .update(row)
      .eq("id", productId);
    if (!error) {
      productError = null;
      break;
    }
    productError = error.message;
    const isSchemaError = Object.keys(row).some((key) =>
      missingColumn(error.message, key)
    );
    if (!isSchemaError) return { error: productError };
  }
  if (productError) return { error: productError };

  for (const row of buildBatchUpdateRows(input)) {
    const { error } = await supabase
      .from("product_batches")
      .update(row)
      .eq("id", batchId);
    if (!error) return { error: null };
    const isSchemaError = Object.keys(row).some((key) =>
      missingColumn(error.message, key)
    );
    if (!isSchemaError) return { error: error.message };
  }

  return { error: "Could not update batch" };
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
