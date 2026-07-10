import type { SupabaseClient } from "@supabase/supabase-js";

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

function missingColumn(message: string, column: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes(column.toLowerCase()) &&
    (lower.includes("column") || lower.includes("schema cache"))
  );
}

function skuFromLot(lotNumber: string): string {
  const cleaned = lotNumber.trim().replace(/\s+/g, "-").toUpperCase();
  return cleaned.startsWith("LOT-") ? cleaned : `LOT-${cleaned}`;
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

  await supabase.from("inventory_transactions").insert({
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
