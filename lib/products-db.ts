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
  return (
    lower.includes(column.toLowerCase()) &&
    (lower.includes("column") || lower.includes("schema cache"))
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
    const isSchemaError = select
      .split(",")
      .some((part) => missingColumn(error.message, part.trim().split("(")[0].trim()));
    if (!isSchemaError && !missingColumn(error.message, "products")) {
      break;
    }
  }

  throw new Error(`Failed to load product inventory: ${lastError}`);
}

function skuFromLot(lotNumber: string): string {
  const cleaned = lotNumber.trim().replace(/\s+/g, "-").toUpperCase();
  const base = cleaned.startsWith("LOT-") ? cleaned : `LOT-${cleaned}`;
  return `${base}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

export async function insertProductEntry(
  supabase: SupabaseClient,
  input: ProductEntryInput
): Promise<{ error: string | null; productId?: string; batchId?: string }> {
  const productBase = {
    product_name: input.product_name.trim(),
    brand_name: input.brand.trim() || null,
    sku: skuFromLot(input.lot_number),
    unit: "pcs",
    selling_price: input.selling_price_retail,
    reorder_level: 10,
  };

  const productVariants = [
    { ...productBase, selling_price_ws: input.selling_price_ws },
    productBase,
  ];

  let productId: string | null = null;
  let lastProductError = "Could not save product";

  for (const row of productVariants) {
    const { data, error } = await supabase
      .from("products")
      .insert(row)
      .select("id")
      .single();

    if (!error && data) {
      productId = data.id;
      break;
    }

    lastProductError = error?.message ?? lastProductError;
    const isSchemaError =
      error &&
      Object.keys(row).some((key) => missingColumn(error.message, key));
    if (!isSchemaError) return { error: lastProductError };
  }

  if (!productId) return { error: lastProductError };

  const batchBase = {
    product_id: productId,
    batch_number: input.lot_number.trim(),
    expiry_date: input.expiry_date,
    quantity_received: input.quantity,
    quantity_remaining: input.quantity,
    purchase_price: input.cost,
  };

  const batchVariants = [
    { ...batchBase, received_date: input.entry_date },
    batchBase,
  ];

  let batchId: string | null = null;
  let lastBatchError = "Could not save batch";

  for (const row of batchVariants) {
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

  const { error: txError } = await supabase.from("inventory_transactions").insert({
    product_id: productId,
    batch_id: batchId,
    transaction_type: "stock_in",
    quantity: input.quantity,
    reference_no: `Entry ${input.lot_number.trim()}`,
  });

  if (txError) {
    await supabase.from("product_batches").delete().eq("id", batchId);
    await supabase.from("products").delete().eq("id", productId);
    return { error: txError.message };
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

  const batchUpdates = [
    {
      batch_number: input.lot_number.trim(),
      expiry_date: input.expiry_date,
      quantity_received: input.quantity,
      quantity_remaining: input.quantity,
      purchase_price: input.cost,
      received_date: input.entry_date,
    },
    {
      batch_number: input.lot_number.trim(),
      expiry_date: input.expiry_date,
      quantity_received: input.quantity,
      quantity_remaining: input.quantity,
      purchase_price: input.cost,
    },
  ];

  for (const row of batchUpdates) {
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
