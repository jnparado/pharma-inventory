import type { SupabaseClient } from "@supabase/supabase-js";
import { isFlatRegister } from "@/lib/products-db";
import { productSellingPrice } from "@/lib/supabase/schema-fallback";

export type PoLineInput = {
  product_id: string;
  quantity: number;
  unit_cost: number;
};

export function generatePoNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const seq = Date.now().toString(36).slice(-4).toUpperCase();
  return `PO-${date}-${seq}`;
}

export async function insertPurchaseOrder(
  supabase: SupabaseClient,
  input: {
    supplier_id: string | null;
    items: PoLineInput[];
    notes?: string | null;
  }
): Promise<{ ok: true; id: string; po_number: string } | { ok: false; error: string }> {
  if (input.items.length === 0) {
    return { ok: false, error: "Add at least one product line" };
  }

  for (const line of input.items) {
    if (!line.product_id || !Number.isInteger(line.quantity) || line.quantity <= 0) {
      return { ok: false, error: "Each line needs a product and valid quantity" };
    }
  }

  const poNumber = generatePoNumber();
  const baseRow: Record<string, string | null> = {
    supplier_id: input.supplier_id,
    po_number: poNumber,
    status: "pending",
  };

  if (input.notes?.trim()) {
    baseRow.notes = input.notes.trim();
  }

  let poId: string | null = null;
  let lastError = "Could not create purchase order";

  for (const row of [
    baseRow,
    { supplier_id: input.supplier_id, po_number: poNumber, status: "pending" },
  ]) {
    const { data, error } = await supabase
      .from("purchase_orders")
      .insert(row)
      .select("id")
      .single();

    if (!error && data) {
      poId = String(data.id);
      break;
    }
    lastError = error?.message ?? lastError;
  }

  if (!poId) {
    return { ok: false, error: lastError };
  }

  const itemRows = input.items.map((line) => ({
    purchase_order_id: poId,
    product_id: line.product_id,
    quantity: line.quantity,
    unit_cost: line.unit_cost,
  }));

  const { error: itemsError } = await supabase
    .from("purchase_order_items")
    .insert(itemRows);

  if (itemsError) {
    await supabase.from("purchase_orders").delete().eq("id", poId);
    return { ok: false, error: itemsError.message };
  }

  return { ok: true, id: poId, po_number: poNumber };
}

export async function autoGeneratePurchaseOrder(
  supabase: SupabaseClient,
  supplierId: string | null
): Promise<
  | { ok: true; id: string; po_number: string; itemCount: number }
  | { ok: false; error: string }
> {
  const flat = await isFlatRegister(supabase);

  const productsRes = await supabase
    .from("products")
    .select("*")
    .order("product_name");

  if (productsRes.error) {
    return { ok: false, error: productsRes.error.message };
  }

  const products = (productsRes.data ?? []) as Record<string, unknown>[];
  const stock = new Map<string, number>();

  if (flat) {
    for (const p of products) {
      stock.set(String(p.id), Number(p.quantity ?? 0));
    }
  } else {
    const batchesRes = await supabase
      .from("product_batches")
      .select("product_id, quantity_remaining");

    if (batchesRes.error) {
      return { ok: false, error: "Failed to load inventory data" };
    }

    for (const b of batchesRes.data ?? []) {
      if (!b.product_id) continue;
      stock.set(
        b.product_id,
        (stock.get(b.product_id) ?? 0) + (b.quantity_remaining ?? 0)
      );
    }
  }

  const lowStock = products.filter((p) => {
    const id = String(p.id);
    const qty = stock.get(id) ?? 0;
    const reorder = Number(p.reorder_level ?? 10);
    return qty <= reorder;
  });

  if (lowStock.length === 0) {
    return {
      ok: false,
      error:
        "No products are at or below reorder level. Use manual mode to create a PO, or lower reorder levels on products.",
    };
  }

  const items: PoLineInput[] = lowStock.map((p) => {
    const id = String(p.id);
    const current = stock.get(id) ?? 0;
    const reorder = Number(p.reorder_level ?? 10);
    const retail = productSellingPrice(p);
    const cost = Number(p.cost ?? p.purchase_price ?? retail * 0.6);
    return {
      product_id: id,
      quantity: Math.max(reorder * 2 - current, reorder),
      unit_cost: cost > 0 ? cost : retail * 0.6,
    };
  });

  const created = await insertPurchaseOrder(supabase, {
    supplier_id: supplierId,
    items,
  });

  if (!created.ok) return created;

  return {
    ok: true,
    id: created.id,
    po_number: created.po_number,
    itemCount: items.length,
  };
}
