"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { insertCustomer, updateCustomerRow } from "@/lib/customers-db";
import { convertPurchaseOrderToSalesInvoice } from "@/lib/purchase-order-invoice";
import { deductStockFefo } from "@/lib/pos";
import { revalidateInventory } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";

import { insertProductEntry, updateProductEntry } from "@/lib/products-db";

function parseProductEntry(formData: FormData) {
  const product_name = String(formData.get("product_name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const lot_number = String(formData.get("lot_number") ?? "").trim();
  const quantity = Number(formData.get("quantity"));
  const cost = Number(formData.get("cost") ?? 0);
  const selling_price_ws = Number(formData.get("selling_price_ws") ?? 0);
  const selling_price_retail = Number(formData.get("selling_price_retail") ?? 0);
  const expiry_date =
    String(formData.get("expiry_date") ?? "").trim() || null;
  const entry_date =
    String(formData.get("entry_date") ?? "").trim() ||
    new Date().toISOString().slice(0, 10);

  return {
    entry_date,
    product_name,
    brand,
    quantity,
    lot_number,
    expiry_date,
    cost,
    selling_price_ws,
    selling_price_retail,
  };
}

export async function createProduct(formData: FormData) {
  await requireAdmin("/products");
  const supabase = createAdminClient();
  const input = parseProductEntry(formData);

  if (!input.product_name || !input.lot_number) {
    redirect("/products?error=Product name and lot number are required");
  }
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    redirect("/products?error=Enter a valid quantity");
  }

  const { error } = await insertProductEntry(supabase, input);
  if (error) redirect(`/products?error=${encodeURIComponent(error)}`);
  revalidateInventory("products", "stock", "dashboard");
  redirect("/products?success=Product added");
}

export async function updateProduct(formData: FormData) {
  await requireAdmin("/products");
  const supabase = createAdminClient();
  const batchId = String(formData.get("batch_id") ?? "");
  const productId = String(formData.get("product_id") ?? "");
  if (!batchId || !productId) {
    redirect("/products?error=Missing product entry id");
  }

  const input = parseProductEntry(formData);
  if (!input.product_name || !input.lot_number) {
    redirect("/products?error=Product name and lot number are required");
  }
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    redirect("/products?error=Enter a valid quantity");
  }

  const { error } = await updateProductEntry(
    supabase,
    batchId,
    productId,
    input
  );
  if (error) redirect(`/products?error=${encodeURIComponent(error)}`);
  revalidateInventory("products", "stock", "dashboard");
  redirect("/products?success=Product updated");
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin("/products");
  const supabase = createAdminClient();
  const batchId = String(formData.get("batch_id") ?? "");
  const productId = String(formData.get("product_id") ?? "");
  if (!batchId || !productId) {
    redirect("/products?error=Missing product entry id");
  }

  const { error: batchError } = await supabase
    .from("product_batches")
    .delete()
    .eq("id", batchId);
  if (batchError) {
    redirect(`/products?error=${encodeURIComponent(batchError.message)}`);
  }

  const { count } = await supabase
    .from("product_batches")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  if ((count ?? 0) === 0) {
    await supabase.from("products").delete().eq("id", productId);
  }

  revalidateInventory("products", "stock", "dashboard");
  redirect("/products?success=Product removed");
}

export async function createSupplier(formData: FormData) {
  await requireAdmin("/suppliers");
  const supabase = createAdminClient();
  const { error } = await supabase.from("suppliers").insert({
    company_name: String(formData.get("company_name") ?? "").trim(),
    contact_person: String(formData.get("contact_person") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
  });
  if (error) redirect(`/suppliers?error=${encodeURIComponent(error.message)}`);
  revalidateInventory("suppliers");
  redirect("/suppliers?success=Supplier added");
}

export async function updateSupplier(formData: FormData) {
  await requireAdmin("/suppliers");
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/suppliers?error=Missing supplier id");

  const { error } = await supabase
    .from("suppliers")
    .update({
      company_name: String(formData.get("company_name") ?? "").trim(),
      contact_person:
        String(formData.get("contact_person") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
    })
    .eq("id", id);

  if (error) redirect(`/suppliers?error=${encodeURIComponent(error.message)}`);
  revalidateInventory("suppliers");
  redirect("/suppliers?success=Supplier updated");
}

export async function deleteSupplier(formData: FormData) {
  await requireAdmin("/suppliers");
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", String(formData.get("id")));
  if (error) redirect(`/suppliers?error=${encodeURIComponent(error.message)}`);
  revalidateInventory("suppliers");
  redirect("/suppliers?success=Supplier deleted");
}

export async function createCustomer(formData: FormData) {
  await requireAdmin("/customers");
  const supabase = createAdminClient();
  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) redirect("/customers?error=Full name is required");

  const { error } = await insertCustomer(supabase, {
    full_name,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
  });

  if (error) redirect(`/customers?error=${encodeURIComponent(error)}`);
  revalidateInventory("customers", "dashboard");
  redirect("/customers?success=Customer added");
}

export async function updateCustomer(formData: FormData) {
  await requireAdmin("/customers");
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!id) redirect("/customers?error=Missing customer id");
  if (!full_name) redirect("/customers?error=Full name is required");

  const { error } = await updateCustomerRow(supabase, id, {
    full_name,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
  });

  if (error) redirect(`/customers?error=${encodeURIComponent(error)}`);
  revalidateInventory("customers", "dashboard");
  redirect("/customers?success=Customer updated");
}

export async function deleteCustomer(formData: FormData) {
  await requireAdmin("/customers");
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", String(formData.get("id")));
  if (error) redirect(`/customers?error=${encodeURIComponent(error.message)}`);
  revalidateInventory("customers", "dashboard");
  redirect("/customers?success=Customer removed");
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

  revalidateInventory("stock");
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
    String(formData.get("reference_no") ?? "").trim() || "stock-out";

  if (!productId || !Number.isInteger(requested) || requested <= 0) {
    redirect("/stock?error=Enter a valid product and quantity");
  }

  try {
    await deductStockFefo(supabase, productId, requested, referenceNo);
  } catch (e) {
    redirect(`/stock?error=${encodeURIComponent((e as Error).message)}`);
  }

  revalidateInventory("stock");
  redirect("/stock?success=Stock dispensed (FEFO)");
}

export async function createBranch(formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("branches").insert({
    name: String(formData.get("name") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
  });
  if (error) redirect(`/branches?error=${encodeURIComponent(error.message)}`);
  revalidateInventory("branches");
  redirect("/branches?success=Branch added");
}

export async function createStockTransfer(formData: FormData) {
  const supabase = createAdminClient();
  const fromBranch = String(formData.get("from_branch") ?? "");
  const toBranch = String(formData.get("to_branch") ?? "");
  if (!fromBranch || !toBranch || fromBranch === toBranch) {
    redirect("/branches?error=Select two different branches");
  }
  const { error } = await supabase.from("stock_transfers").insert({
    from_branch: fromBranch,
    to_branch: toBranch,
    status: "pending",
  });
  if (error) redirect(`/branches?error=${encodeURIComponent(error.message)}`);
  revalidateInventory("branches");
  redirect("/branches?success=Transfer request created");
}

export async function updateTransferStatus(formData: FormData) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("stock_transfers")
    .update({ status: String(formData.get("status")) })
    .eq("id", String(formData.get("id")));
  if (error) redirect(`/branches?error=${encodeURIComponent(error.message)}`);
  revalidateInventory("branches");
  redirect("/branches?success=Transfer updated");
}

export async function generatePurchaseOrders() {
  const supabase = createAdminClient();
  const [productsRes, batchesRes, suppliersRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, product_name, sku, reorder_level, selling_price")
      .order("product_name"),
    supabase
      .from("product_batches")
      .select("product_id, quantity_remaining"),
    supabase.from("suppliers").select("id").limit(1),
  ]);

  if (productsRes.error || batchesRes.error) {
    redirect("/orders?error=Failed to load inventory data");
  }

  const stock = new Map<string, number>();
  for (const b of batchesRes.data ?? []) {
    if (!b.product_id) continue;
    stock.set(
      b.product_id,
      (stock.get(b.product_id) ?? 0) + (b.quantity_remaining ?? 0)
    );
  }

  const lowStock = (productsRes.data ?? []).filter((p) => {
    const qty = stock.get(p.id) ?? 0;
    return qty <= (p.reorder_level ?? 10);
  });

  if (lowStock.length === 0) {
    redirect("/orders?error=No products need reordering");
  }

  const supplierId = suppliersRes.data?.[0]?.id ?? null;
  const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .insert({
      supplier_id: supplierId,
      po_number: poNumber,
      status: "pending",
    })
    .select("id")
    .single();

  if (poError) redirect(`/orders?error=${encodeURIComponent(poError.message)}`);

  const items = lowStock.map((p) => {
    const current = stock.get(p.id) ?? 0;
    const reorder = p.reorder_level ?? 10;
    return {
      purchase_order_id: po.id,
      product_id: p.id,
      quantity: Math.max(reorder * 2 - current, reorder),
      unit_cost: Number(p.selling_price) * 0.6,
    };
  });

  const { error: itemsError } = await supabase
    .from("purchase_order_items")
    .insert(items);
  if (itemsError)
    redirect(`/orders?error=${encodeURIComponent(itemsError.message)}`);

  revalidateInventory("orders");
  redirect(`/orders?success=Auto PO ${poNumber} created (${items.length} items)`);
}

export async function updateOrderStatus(formData: FormData) {
  const supabase = createAdminClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));

  if (!id) {
    redirect("/orders?error=Missing%20order%20id");
  }

  if (status === "approved") {
    let result;
    try {
      result = await convertPurchaseOrderToSalesInvoice(supabase, id);
    } catch (e) {
      redirect(
        `/orders?error=${encodeURIComponent((e as Error).message ?? "Approval failed")}`
      );
    }

    if (!result.ok) {
      redirect(`/orders?error=${encodeURIComponent(result.error)}`);
    }
    revalidateInventory("orders", "sales", "stock");
    const message = result.alreadyExists
      ? `Receipt ${result.receiptNumber} issued (Invoice ${result.invoiceNumber})`
      : `Invoice ${result.invoiceNumber} converted to Receipt ${result.receiptNumber}`;
    redirect(
      `/receipt/${result.saleId}?success=${encodeURIComponent(message)}`
    );
  }

  const { error } = await supabase
    .from("purchase_orders")
    .update({ status })
    .eq("id", id);
  if (error) redirect(`/orders?error=${encodeURIComponent(error.message)}`);
  revalidateInventory("orders");
  redirect("/orders?success=Order status updated");
}

export async function processPrescription(formData: FormData) {
  const supabase = createAdminClient();
  const text = String(formData.get("prescription_text") ?? "").trim();
  const doctor = String(formData.get("doctor_name") ?? "").trim() || null;

  if (!text) redirect("/prescriptions?error=Enter prescription text");

  const { error } = await supabase.from("prescriptions").insert({
    doctor_name: doctor,
    status: "processed",
    prescription_image_url: null,
  });
  if (error)
    redirect(`/prescriptions?error=${encodeURIComponent(error.message)}`);

  revalidateInventory("prescriptions");
  redirect(
    `/prescriptions?success=Prescription saved&text=${encodeURIComponent(text)}`
  );
}

export async function quickScanStockOut(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 1);
  if (!code) redirect("/scan?error=No barcode scanned");

  const supabase = createAdminClient();
  const { data: matches } = await supabase
    .from("products")
    .select("id")
    .or(`sku.eq.${code},barcode.eq.${code}`)
    .limit(1);

  const productId = matches?.[0]?.id;

  if (!productId) redirect(`/scan?error=Product not found for ${code}`);

  const fd = new FormData();
  fd.set("product_id", productId);
  fd.set("quantity", String(quantity));
  fd.set("reference_no", `Scan: ${code}`);
  return stockOut(fd);
}
