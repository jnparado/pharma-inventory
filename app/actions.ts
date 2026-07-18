"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { insertCustomer, updateCustomerRow } from "@/lib/customers-db";
import { convertPurchaseOrderToSalesInvoice } from "@/lib/purchase-order-invoice";
import { autoGeneratePurchaseOrder } from "@/lib/purchase-orders";
import { deductStockFifo } from "@/lib/pos";
import { revalidateInventory, revalidateProductsPage } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  deleteProductEntry,
  insertProductEntry,
  parseProductEntryBody,
  updateProductEntry,
  validateProductEntry,
} from "@/lib/products-db";

export async function createProduct(formData: FormData) {
  await requireAdmin("/products");
  const supabase = createAdminClient();
  const input = parseProductEntryBody(Object.fromEntries(formData.entries()));
  const validationError = validateProductEntry(input);
  if (validationError) {
    redirect(`/products?error=${encodeURIComponent(validationError)}`);
  }

  const { error } = await insertProductEntry(supabase, input);
  if (error) redirect(`/products?error=${encodeURIComponent(error)}`);
  revalidateProductsPage();
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

  const input = parseProductEntryBody(Object.fromEntries(formData.entries()));
  const validationError = validateProductEntry(input);
  if (validationError) {
    redirect(`/products?error=${encodeURIComponent(validationError)}`);
  }

  const { error } = await updateProductEntry(
    supabase,
    batchId,
    productId,
    input
  );
  if (error) redirect(`/products?error=${encodeURIComponent(error)}`);
  revalidateProductsPage();
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

  const { error } = await deleteProductEntry(supabase, productId, batchId);
  if (error) {
    redirect(`/products?error=${encodeURIComponent(error)}`);
  }

  revalidateProductsPage();
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
 * Dispense/sell stock using FIFO: deduct from the oldest received batch
 * first, spilling over to newer batches as needed. Expired batches are
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
    await deductStockFifo(supabase, productId, requested, referenceNo);
  } catch (e) {
    redirect(`/stock?error=${encodeURIComponent((e as Error).message)}`);
  }

  revalidateInventory("stock");
  redirect("/stock?success=Stock dispensed (FIFO)");
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
  await requireAdmin("/orders");
  const supabase = createAdminClient();

  const suppliersRes = await supabase.from("suppliers").select("id").limit(1);
  const supplierId = suppliersRes.data?.[0]?.id ?? null;

  const result = await autoGeneratePurchaseOrder(supabase, supplierId);
  if (!result.ok) {
    redirect(`/orders?error=${encodeURIComponent(result.error)}`);
  }

  const convert = await convertPurchaseOrderToSalesInvoice(supabase, result.id);
  if (!convert.ok) {
    await supabase.from("purchase_order_items").delete().eq("purchase_order_id", result.id);
    await supabase.from("purchase_orders").delete().eq("id", result.id);
    redirect(`/orders?error=${encodeURIComponent(convert.error)}`);
  }

  revalidateInventory("orders", "stock", "sales", "products");
  redirect(
    `/orders?success=${encodeURIComponent(
      `Auto PO ${result.po_number} — Sales Invoice ${convert.invoiceNumber} (${result.itemCount} items, inventory updated)`
    )}`
  );
}

export async function updateOrderStatus(formData: FormData) {
  await requireAdmin("/orders");
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
    revalidateInventory("orders", "sales", "stock", "products");
    const message = result.alreadyExists
      ? `Sales Invoice ${result.invoiceNumber} already exists`
      : `Sales Invoice ${result.invoiceNumber} created and inventory updated`;
    redirect(`/orders?success=${encodeURIComponent(message)}`);
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
