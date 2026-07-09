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

function isMissingReceiptColumn(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("receipt_number") &&
    (lower.includes("column") ||
      lower.includes("schema cache") ||
      lower.includes("does not exist"))
  );
}

async function loadSaleForReceipt(
  supabase: SupabaseClient,
  saleId: string
): Promise<{ id: string; invoice_number: string; receipt_number?: string | null }> {
  const withReceipt = await supabase
    .from("sales")
    .select("id, invoice_number, receipt_number")
    .eq("id", saleId)
    .maybeSingle();

  if (!withReceipt.error && withReceipt.data) {
    return withReceipt.data;
  }

  if (!isMissingReceiptColumn(withReceipt.error?.message)) {
    throw new Error(withReceipt.error?.message ?? "Sale not found");
  }

  const basic = await supabase
    .from("sales")
    .select("id, invoice_number")
    .eq("id", saleId)
    .maybeSingle();

  if (basic.error || !basic.data) {
    throw new Error(basic.error?.message ?? "Sale not found");
  }

  return basic.data;
}

/** Convert a sales invoice to an official receipt (OR- number). */
export async function issueReceiptForSale(
  supabase: SupabaseClient,
  saleId: string
): Promise<{ receiptNumber: string; persisted: boolean }> {
  const sale = await loadSaleForReceipt(supabase, saleId);

  if (sale.receipt_number) {
    return { receiptNumber: sale.receipt_number, persisted: true };
  }

  const receiptNumber = receiptNumberFromInvoice(sale.invoice_number);

  const { error: updateError } = await supabase
    .from("sales")
    .update({ receipt_number: receiptNumber })
    .eq("id", saleId);

  if (updateError && !isMissingReceiptColumn(updateError.message)) {
    throw new Error(updateError.message);
  }

  return {
    receiptNumber,
    persisted: !updateError,
  };
}

/** Load sales linked to PO invoice numbers; works without receipt_number column. */
export async function loadSalesByInvoiceNumbers(
  supabase: SupabaseClient,
  invoiceNumbers: string[]
) {
  if (invoiceNumbers.length === 0) return [];

  const withReceipt = await supabase
    .from("sales")
    .select("id, invoice_number, receipt_number, total_amount")
    .in("invoice_number", invoiceNumbers);

  if (!withReceipt.error) {
    return withReceipt.data ?? [];
  }

  if (!isMissingReceiptColumn(withReceipt.error.message)) {
    throw new Error(withReceipt.error.message);
  }

  const basic = await supabase
    .from("sales")
    .select("id, invoice_number, total_amount")
    .in("invoice_number", invoiceNumbers);

  if (basic.error) {
    throw new Error(basic.error.message);
  }

  return (basic.data ?? []).map((row) => ({
    ...row,
    receipt_number: null as string | null,
  }));
}
