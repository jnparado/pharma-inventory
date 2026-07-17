import type { SupabaseClient } from "@supabase/supabase-js";
import { isFlatRegister } from "@/lib/products-db";
import { isSchemaError } from "@/lib/supabase/schema-fallback";

export type StockAllocation = {
  batch_id: string;
  quantity: number;
};

const FLAT_PRODUCT_SELECTS = [
  "id, quantity, exp_date",
  "id, quantity, expiry_date",
  "id, quantity, expiry_date, exp_date",
  "id, quantity",
] as const;

type FlatProductRow = {
  id: string;
  quantity: number | null;
  expiry: string | null;
};

function readExpiry(row: Record<string, unknown>): string | null {
  const expiry =
    (row.exp_date as string | null | undefined) ??
    (row.expiry_date as string | null | undefined);
  return expiry ? String(expiry).slice(0, 10) : null;
}

async function loadFlatProductRow(
  supabase: SupabaseClient,
  productId: string,
  mode: "single" | "maybe" = "single"
): Promise<FlatProductRow | null> {
  let lastError = "Product not found";

  for (const select of FLAT_PRODUCT_SELECTS) {
    const query = supabase.from("products").select(select).eq("id", productId);
    const result =
      mode === "maybe" ? await query.maybeSingle() : await query.single();

    if (!result.error && result.data) {
      const row = result.data as unknown as Record<string, unknown>;
      return {
        id: String(row.id),
        quantity: Number(row.quantity ?? 0),
        expiry: readExpiry(row),
      };
    }

    lastError = result.error?.message ?? lastError;
    if (result.error && !isSchemaError(result.error.message)) {
      throw new Error(result.error.message);
    }
  }

  if (mode === "maybe") return null;
  throw new Error(lastError);
}

function productExpiryPassed(
  expiry: string | null | undefined,
  today: string
): boolean {
  if (!expiry) return false;
  return expiry.slice(0, 10) < today;
}

/** Non-expired stock available for a product (FIFO-eligible batches or flat quantity). */
export async function getAvailableStock(
  supabase: SupabaseClient,
  productId: string
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);

  if (await isFlatRegister(supabase)) {
    const row = await loadFlatProductRow(supabase, productId, "maybe");
    if (!row) return 0;

    if (productExpiryPassed(row.expiry, today)) return 0;
    return row.quantity ?? 0;
  }

  const { data: batches, error } = await supabase
    .from("product_batches")
    .select("quantity_remaining")
    .eq("product_id", productId)
    .gt("quantity_remaining", 0)
    .or(`expiry_date.gte.${today},expiry_date.is.null`);

  if (error) throw new Error(error.message);
  return (batches ?? []).reduce(
    (sum, b) => sum + (b.quantity_remaining ?? 0),
    0
  );
}

/** Deduct stock using FIFO (oldest received first) and log inventory transactions. */
export async function deductStockFifo(
  supabase: SupabaseClient,
  productId: string,
  quantity: number,
  referenceNo: string
): Promise<StockAllocation[]> {
  if (await isFlatRegister(supabase)) {
    const row = await loadFlatProductRow(supabase, productId, "single");
    if (!row) throw new Error("Product not found");

    const today = new Date().toISOString().slice(0, 10);
    if (productExpiryPassed(row.expiry, today)) {
      throw new Error("This product batch has expired and cannot be dispensed");
    }

    const available = row.quantity ?? 0;
    if (available < quantity) {
      throw new Error(`Insufficient stock: only ${available} available`);
    }

    const { error: updateError } = await supabase
      .from("products")
      .update({ quantity: available - quantity })
      .eq("id", productId);

    if (updateError) throw new Error(updateError.message);

    void supabase.from("inventory_transactions").insert({
      product_id: productId,
      batch_id: productId,
      transaction_type: "stock_out",
      quantity,
      reference_no: referenceNo,
    });

    return [{ batch_id: productId, quantity }];
  }

  const today = new Date().toISOString().slice(0, 10);
  const orderAttempts = [
    { col: "received_date", nullsFirst: false },
    { col: "created_at", nullsFirst: false },
  ] as const;

  let batches: {
    id: string;
    quantity_remaining: number | null;
    expiry_date: string | null;
    received_date?: string | null;
    created_at?: string | null;
  }[] | null = null;

  for (const { col, nullsFirst } of orderAttempts) {
    const { data, error } = await supabase
      .from("product_batches")
      .select("id, quantity_remaining, expiry_date, received_date, created_at")
      .eq("product_id", productId)
      .gt("quantity_remaining", 0)
      .or(`expiry_date.gte.${today},expiry_date.is.null`)
      .order(col, { ascending: true, nullsFirst });

    if (!error) {
      batches = data ?? [];
      break;
    }
  }

  if (!batches) {
    const { data, error } = await supabase
      .from("product_batches")
      .select("id, quantity_remaining, expiry_date, created_at")
      .eq("product_id", productId)
      .gt("quantity_remaining", 0)
      .or(`expiry_date.gte.${today},expiry_date.is.null`)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    batches = data ?? [];
  }

  const available = batches.reduce(
    (sum, b) => sum + (b.quantity_remaining ?? 0),
    0
  );
  if (available < quantity) {
    throw new Error(`Insufficient stock: only ${available} available`);
  }

  const allocations: StockAllocation[] = [];
  const batchUpdates: { id: string; quantity_remaining: number }[] = [];
  let remaining = quantity;

  for (const batch of batches) {
    if (remaining <= 0) break;
    const inBatch = batch.quantity_remaining ?? 0;
    const take = Math.min(inBatch, remaining);
    if (take <= 0) continue;
    remaining -= take;

    batchUpdates.push({
      id: batch.id,
      quantity_remaining: inBatch - take,
    });
    allocations.push({ batch_id: batch.id, quantity: take });
  }

  await Promise.all(
    batchUpdates.map(({ id, quantity_remaining }) =>
      supabase
        .from("product_batches")
        .update({ quantity_remaining })
        .eq("id", id)
        .then(({ error: updateError }) => {
          if (updateError) throw new Error(updateError.message);
        })
    )
  );

  if (allocations.length > 0) {
    const { error: txError } = await supabase
      .from("inventory_transactions")
      .insert(
        allocations.map(({ batch_id, quantity: take }) => ({
          product_id: productId,
          batch_id,
          transaction_type: "stock_out",
          quantity: take,
          reference_no: referenceNo,
        }))
      );
    if (txError) throw new Error(txError.message);
  }

  return allocations;
}

/** @deprecated Use deductStockFifo */
export const deductStockFefo = deductStockFifo;

export function generateInvoiceNumber(): string {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, "");
  const seq = Date.now().toString(36).slice(-4).toUpperCase();
  return `INV-${date}-${seq}`;
}
