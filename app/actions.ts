"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

function revalidateAll() {
  for (const path of ["/", "/products", "/suppliers", "/stock", "/expiry"]) {
    revalidatePath(path);
  }
}

/** Find a category by name (case-insensitive), creating it if needed. */
async function resolveCategoryId(
  supabase: ReturnType<typeof createAdminClient>,
  name: string
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", trimmed)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("categories")
    .insert({ name: trimmed })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created.id;
}

export async function createProduct(formData: FormData) {
  const supabase = createAdminClient();

  let categoryId: string | null = null;
  try {
    categoryId = await resolveCategoryId(
      supabase,
      String(formData.get("category") ?? "")
    );
  } catch (e) {
    redirect(`/products?error=${encodeURIComponent((e as Error).message)}`);
  }

  const { error } = await supabase.from("products").insert({
    product_name: String(formData.get("product_name") ?? "").trim(),
    generic_name: String(formData.get("generic_name") ?? "").trim() || null,
    brand_name: String(formData.get("brand_name") ?? "").trim() || null,
    sku: String(formData.get("sku") ?? "").trim(),
    category_id: categoryId,
    unit: String(formData.get("unit") ?? "pcs").trim() || "pcs",
    selling_price: Number(formData.get("selling_price") ?? 0),
    reorder_level: Number(formData.get("reorder_level") ?? 10),
    requires_prescription: formData.get("requires_prescription") === "on",
  });
  if (error) redirect(`/products?error=${encodeURIComponent(error.message)}`);
  revalidateAll();
  redirect("/products?success=Product added");
}

export async function deleteProduct(formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", String(formData.get("id")));
  if (error) redirect(`/products?error=${encodeURIComponent(error.message)}`);
  revalidateAll();
  redirect("/products?success=Product deleted");
}

export async function createSupplier(formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("suppliers").insert({
    company_name: String(formData.get("company_name") ?? "").trim(),
    contact_person: String(formData.get("contact_person") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
  });
  if (error) redirect(`/suppliers?error=${encodeURIComponent(error.message)}`);
  revalidateAll();
  redirect("/suppliers?success=Supplier added");
}

export async function deleteSupplier(formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", String(formData.get("id")));
  if (error) redirect(`/suppliers?error=${encodeURIComponent(error.message)}`);
  revalidateAll();
  redirect("/suppliers?success=Supplier deleted");
}

/** Receive stock: creates a product batch plus a matching stock-in transaction. */
export async function stockIn(formData: FormData) {
  const supabase = createAdminClient();
  const productId = String(formData.get("product_id"));
  const quantity = Number(formData.get("quantity"));

  if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
    redirect("/stock?error=Enter a valid product and quantity");
  }

  const { data: batch, error: batchError } = await supabase
    .from("product_batches")
    .insert({
      product_id: productId,
      supplier_id: String(formData.get("supplier_id") ?? "") || null,
      batch_number: String(formData.get("batch_number") ?? "").trim(),
      expiry_date: String(formData.get("expiry_date")) || null,
      quantity_received: quantity,
      quantity_remaining: quantity,
      purchase_price: Number(formData.get("purchase_price") ?? 0),
    })
    .select("id")
    .single();
  if (batchError) {
    redirect(`/stock?error=${encodeURIComponent(batchError.message)}`);
  }

  const { error: txError } = await supabase
    .from("inventory_transactions")
    .insert({
      product_id: productId,
      batch_id: batch.id,
      transaction_type: "stock_in",
      quantity,
      reference_no: String(formData.get("reference_no") ?? "").trim() || null,
    });
  if (txError) redirect(`/stock?error=${encodeURIComponent(txError.message)}`);

  revalidateAll();
  redirect("/stock?success=Stock received");
}

/**
 * Dispense/sell stock using FEFO: deduct from the batch expiring soonest
 * first, spilling over to later batches as needed. Expired batches are
 * skipped and must be disposed of separately.
 */
export async function stockOut(formData: FormData) {
  const supabase = createAdminClient();
  const productId = String(formData.get("product_id"));
  const requested = Number(formData.get("quantity"));
  const referenceNo =
    String(formData.get("reference_no") ?? "").trim() || null;

  if (!productId || !Number.isInteger(requested) || requested <= 0) {
    redirect("/stock?error=Enter a valid product and quantity");
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: batches, error: batchError } = await supabase
    .from("product_batches")
    .select("id, quantity_remaining, expiry_date")
    .eq("product_id", productId)
    .gt("quantity_remaining", 0)
    .or(`expiry_date.gte.${today},expiry_date.is.null`)
    .order("expiry_date", { ascending: true, nullsFirst: false });
  if (batchError) {
    redirect(`/stock?error=${encodeURIComponent(batchError.message)}`);
  }

  const available = batches.reduce(
    (sum, b) => sum + (b.quantity_remaining ?? 0),
    0
  );
  if (available < requested) {
    redirect(
      `/stock?error=${encodeURIComponent(
        `Insufficient non-expired stock: only ${available} available`
      )}`
    );
  }

  let remaining = requested;
  for (const batch of batches) {
    if (remaining <= 0) break;
    const inBatch = batch.quantity_remaining ?? 0;
    const take = Math.min(inBatch, remaining);
    if (take <= 0) continue;
    remaining -= take;

    const { error: updateError } = await supabase
      .from("product_batches")
      .update({ quantity_remaining: inBatch - take })
      .eq("id", batch.id);
    if (updateError) {
      redirect(`/stock?error=${encodeURIComponent(updateError.message)}`);
    }

    const { error: txError } = await supabase
      .from("inventory_transactions")
      .insert({
        product_id: productId,
        batch_id: batch.id,
        transaction_type: "stock_out",
        quantity: take,
        reference_no: referenceNo,
      });
    if (txError) {
      redirect(`/stock?error=${encodeURIComponent(txError.message)}`);
    }
  }

  revalidateAll();
  redirect("/stock?success=Stock dispensed (FEFO)");
}
