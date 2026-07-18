import type { SupabaseClient } from "@supabase/supabase-js";
import { receiveStockForPo } from "@/lib/pos";
import { loadSalesByInvoiceNumbers } from "@/lib/receipt";
import {
  isSchemaError,
  PO_CONVERT_SELECTS,
  productSellingPrice,
} from "@/lib/supabase/schema-fallback";

export function salesInvoiceNumberForPo(poNumber: string): string {
  return `SI-${poNumber}`;
}

function productRow(value: unknown) {
  if (!value) return null;
  return (Array.isArray(value) ? value[0] : value) as Record<string, unknown>;
}

type PoLine = {
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  subtotal: number;
};

type ConvertResult =
  | {
      ok: true;
      invoiceNumber: string;
      receiptNumber: string | null;
      saleId: string;
      alreadyExists: boolean;
    }
  | { ok: false; error: string };

async function loadPurchaseOrderForConvert(
  supabase: SupabaseClient,
  purchaseOrderId: string
) {
  for (const select of PO_CONVERT_SELECTS) {
    const { data, error } = await supabase
      .from("purchase_orders")
      .select(select)
      .eq("id", purchaseOrderId)
      .single();

    if (!error && data) return data;
    if (error && !isSchemaError(error.message)) break;
  }
  return null;
}

/** Create a sales invoice from a purchase order and add items to inventory. */
export async function convertPurchaseOrderToSalesInvoice(
  supabase: SupabaseClient,
  purchaseOrderId: string
): Promise<ConvertResult> {
  const po = await loadPurchaseOrderForConvert(supabase, purchaseOrderId);

  if (!po) {
    return { ok: false, error: "Purchase order not found" };
  }

  const items = (po.purchase_order_items ?? []) as Array<{
    id: string;
    product_id: string | null;
    quantity: number;
    unit_cost: number | null;
    products: unknown;
  }>;

  if (items.length === 0) {
    return { ok: false, error: "Purchase order has no line items" };
  }

  const invoiceNumber = salesInvoiceNumberForPo(po.po_number as string);
  const supplierId = (po.supplier_id as string | null) ?? null;

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

    return {
      ok: true,
      invoiceNumber: existing.invoice_number,
      receiptNumber: null,
      saleId: existing.id,
      alreadyExists: true,
    };
  }

  let total = 0;
  const lines: PoLine[] = items.map((item) => {
    const product = productRow(item.products);
    const unitCost = Number(item.unit_cost ?? 0);
    const unitPrice =
      unitCost > 0 ? unitCost : productSellingPrice(product) || 0;
    const subtotal = item.quantity * unitPrice;
    total += subtotal;
    return {
      product_id: item.product_id,
      product_name: String(product?.product_name ?? "Product"),
      quantity: item.quantity,
      unit_price: unitPrice,
      unit_cost: unitCost,
      subtotal,
    };
  });

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

      const allocations = await receiveStockForPo(
        supabase,
        line.product_id,
        line.quantity,
        invoiceNumber,
        { unitCost: line.unit_cost, supplierId }
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

  return {
    ok: true,
    invoiceNumber,
    receiptNumber: null,
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
  const rows = await loadSalesByInvoiceNumbers(supabase, invoiceNumbers);

  const map = new Map<
    string,
    { invoice_number: string; receipt_number: string | null; total_amount: number; sale_id: string }
  >();
  for (const row of rows) {
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
