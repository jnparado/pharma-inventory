import type { SupabaseClient } from "@supabase/supabase-js";
import { isFlatRegister } from "@/lib/products-db";

export type FefoAllocation = {
  batch_id: string;
  quantity: number;
};

function productExpiryPassed(
  expiry: string | null | undefined,
  today: string
): boolean {
  if (!expiry) return false;
  return expiry < today;
}

/** Non-expired stock available for a product (FEFO-eligible batches or flat quantity). */
export async function getAvailableStock(
  supabase: SupabaseClient,
  productId: string
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);

  if (await isFlatRegister(supabase)) {
    const { data, error } = await supabase
      .from("products")
      .select("quantity, expiry_date, exp_date")
      .eq("id", productId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return 0;

    const expiry =
      (data.expiry_date as string | null) ?? (data.exp_date as string | null);
    if (productExpiryPassed(expiry, today)) return 0;
    return Number(data.quantity ?? 0);
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

/** Deduct stock using FEFO and log inventory transactions. Returns batch allocations. */
export async function deductStockFefo(
  supabase: SupabaseClient,
  productId: string,
  quantity: number,
  referenceNo: string
): Promise<FefoAllocation[]> {
  if (await isFlatRegister(supabase)) {
    const { data, error } = await supabase
      .from("products")
      .select("id, quantity")
      .eq("id", productId)
      .single();

    if (error) throw new Error(error.message);

    const available = Number(data.quantity ?? 0);
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
  const { data: batches, error } = await supabase
    .from("product_batches")
    .select("id, quantity_remaining, expiry_date")
    .eq("product_id", productId)
    .gt("quantity_remaining", 0)
    .or(`expiry_date.gte.${today},expiry_date.is.null`)
    .order("expiry_date", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);

  const available = (batches ?? []).reduce(
    (sum, b) => sum + (b.quantity_remaining ?? 0),
    0
  );
  if (available < quantity) {
    throw new Error(`Insufficient stock: only ${available} available`);
  }

  const allocations: FefoAllocation[] = [];
  const batchUpdates: { id: string; quantity_remaining: number }[] = [];
  let remaining = quantity;

  for (const batch of batches ?? []) {
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

export function generateInvoiceNumber(): string {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, "");
  const seq = Date.now().toString(36).slice(-4).toUpperCase();
  return `INV-${date}-${seq}`;
}
