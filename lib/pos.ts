import type { SupabaseClient } from "@supabase/supabase-js";

export type FefoAllocation = {
  batch_id: string;
  quantity: number;
};

/** Non-expired stock available for a product (FEFO-eligible batches). */
export async function getAvailableStock(
  supabase: SupabaseClient,
  productId: string
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
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
