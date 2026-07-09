import type { SupabaseClient } from "@supabase/supabase-js";
import { deductStockFefo, getAvailableStock } from "@/lib/pos";
import { issueReceiptForSale } from "@/lib/receipt";

export function salesInvoiceNumberForPo(poNumber: string): string {
  return `SI-${poNumber}`;
}

function productRow(
  products:
    | { selling_price: number; product_name?: string }
    | { selling_price: number; product_name?: string }[]
    | null
    | undefined
) {
  if (!products) return null;
  return Array.isArray(products) ? products[0] : products;
}

function productSellingPrice(
  products: { selling_price: number } | { selling_price: number }[] | null | undefined
): number {
  return Number(productRow(products)?.selling_price ?? 0);
}

type PoLine = {
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type ConvertResult =
  | {
      ok: true;
      invoiceNumber: string;
      receiptNumber: string;
      saleId: string;
      alreadyExists: boolean;
    }
  | { ok: false; error: string };

async function assertStockForLines(
  supabase: SupabaseClient,
  lines: PoLine[]
): Promise<void> {
  for (const line of lines) {
    if (!line.product_id) {
      throw new Error("Purchase order has a line without a product");
    }
    const available = await getAvailableStock(supabase, line.product_id);
    if (available < line.quantity) {
      throw new Error(
        `Insufficient stock for ${line.product_name}: need ${line.quantity}, only ${available} available`
      );
    }
  }
}

/** Create a sales invoice from an approved purchase order and deduct inventory (FEFO). */
export async function convertPurchaseOrderToSalesInvoice(
  supabase: SupabaseClient,
  purchaseOrderId: string
): Promise<ConvertResult> {
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .select(
      "id, po_number, status, supplier_id, purchase_order_items(id, product_id, quantity, unit_cost, products(product_name, selling_price))"
    )
    .eq("id", purchaseOrderId)
    .single();

  if (poError || !po) {
    return { ok: false, error: "Purchase order not found" };
  }

  const items = po.purchase_order_items ?? [];
  if (items.length === 0) {
    return { ok: false, error: "Purchase order has no line items" };
  }

  const invoiceNumber = salesInvoiceNumberForPo(po.po_number);

  const { data: existing } = await supabase
    .from("sales")
    .select("id, invoice_number")
    .eq("invoice_number", invoiceNumber)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("purchase_orders")
      .update({ status: "approved" })
      .eq("id", purchaseOrderId);

    const receipt = await issueReceiptForSale(supabase, existing.id);

    return {
      ok: true,
      invoiceNumber: existing.invoice_number,
      receiptNumber: receipt.receiptNumber,
      saleId: existing.id,
      alreadyExists: true,
    };
  }

  let total = 0;
  const lines: PoLine[] = items.map((item) => {
    const product = productRow(item.products);
    const unitPrice =
      productSellingPrice(item.products) || Number(item.unit_cost ?? 0);
    const subtotal = item.quantity * unitPrice;
    total += subtotal;
    return {
      product_id: item.product_id,
      product_name: product?.product_name ?? "Product",
      quantity: item.quantity,
      unit_price: unitPrice,
      subtotal,
    };
  });

  try {
    await assertStockForLines(supabase, lines);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      invoice_number: invoiceNumber,
      total_amount: total,
      payment_method: "purchase_order",
    })
    .select("id")
    .single();

  if (saleError || !sale) {
    return { ok: false, error: saleError?.message ?? "Failed to create sales invoice" };
  }

  try {
    for (const line of lines) {
      if (!line.product_id) continue;

      const allocations = await deductStockFefo(
        supabase,
        line.product_id,
        line.quantity,
        invoiceNumber
      );

      for (const alloc of allocations) {
        const lineTotal = alloc.quantity * line.unit_price;
        const { error: itemError } = await supabase.from("sale_items").insert({
          sale_id: sale.id,
          product_id: line.product_id,
          batch_id: alloc.batch_id,
          quantity: alloc.quantity,
          unit_price: line.unit_price,
          subtotal: lineTotal,
        });
        if (itemError) throw new Error(itemError.message);
      }
    }
  } catch (e) {
    await supabase.from("sale_items").delete().eq("sale_id", sale.id);
    await supabase.from("sales").delete().eq("id", sale.id);
    return { ok: false, error: (e as Error).message };
  }

  const { error: statusError } = await supabase
    .from("purchase_orders")
    .update({ status: "approved" })
    .eq("id", purchaseOrderId);

  if (statusError) {
    return { ok: false, error: statusError.message };
  }

  const receipt = await issueReceiptForSale(supabase, sale.id);

  return {
    ok: true,
    invoiceNumber,
    receiptNumber: receipt.receiptNumber,
    saleId: sale.id,
    alreadyExists: false,
  };
}

export async function getSalesInvoicesForPurchaseOrders(
  supabase: SupabaseClient,
  poNumbers: string[]
) {
  if (poNumbers.length === 0) {
    return new Map<
      string,
      { invoice_number: string; receipt_number: string | null; total_amount: number; sale_id: string }
    >();
  }

  const invoiceNumbers = poNumbers.map(salesInvoiceNumberForPo);
  const { data } = await supabase
    .from("sales")
    .select("id, invoice_number, receipt_number, total_amount")
    .in("invoice_number", invoiceNumbers);

  const map = new Map<
    string,
    { invoice_number: string; receipt_number: string | null; total_amount: number; sale_id: string }
  >();
  for (const row of data ?? []) {
    const poNumber = row.invoice_number.replace(/^SI-/, "");
    map.set(poNumber, {
      invoice_number: row.invoice_number,
      receipt_number: row.receipt_number ?? null,
      total_amount: row.total_amount,
      sale_id: row.id,
    });
  }
  return map;
}
