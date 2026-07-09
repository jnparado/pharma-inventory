import type { SupabaseClient } from "@supabase/supabase-js";
import type { Sale } from "@/lib/types";

export function generateReceiptNumber(): string {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, "");
  const seq = Date.now().toString(36).slice(-4).toUpperCase();
  return `OR-${date}-${seq}`;
}

/** Derive receipt number from invoice when receipt_number is not stored. */
export function receiptNumberFromInvoice(invoiceNumber: string): string {
  if (invoiceNumber.startsWith("OR-")) return invoiceNumber;
  return invoiceNumber.replace(/^SI-/, "OR-").replace(/^INV-/, "OR-");
}

export function displayReceiptNumber(
  sale: Pick<Sale, "receipt_number" | "invoice_number">
): string {
  if (sale.receipt_number) return sale.receipt_number;
  return receiptNumberFromInvoice(sale.invoice_number);
}

/** Convert a sales invoice to an official receipt (OR- number). */
export async function issueReceiptForSale(
  supabase: SupabaseClient,
  saleId: string
): Promise<{ receiptNumber: string; persisted: boolean }> {
  const { data: sale, error: fetchError } = await supabase
    .from("sales")
    .select("id, invoice_number, receipt_number")
    .eq("id", saleId)
    .single();

  if (fetchError || !sale) {
    throw new Error("Sale not found");
  }

  if (sale.receipt_number) {
    return { receiptNumber: sale.receipt_number, persisted: true };
  }

  const receiptNumber = receiptNumberFromInvoice(sale.invoice_number);

  const { error: updateError } = await supabase
    .from("sales")
    .update({ receipt_number: receiptNumber })
    .eq("id", saleId);

  if (updateError) {
    return { receiptNumber, persisted: false };
  }

  return { receiptNumber, persisted: true };
}
