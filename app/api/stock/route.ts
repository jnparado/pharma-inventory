import { NextResponse } from "next/server";
import { hasServiceRoleKey } from "@/lib/env";
import { deductStockFifo, generateInvoiceNumber } from "@/lib/pos";
import { issueReceiptForSale } from "@/lib/receipt";
import { revalidateInventory } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveUser } from "@/lib/user-session";

export async function POST(request: Request) {
  const user = await getActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is missing on the server." },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const supabase = createAdminClient();

    if (action === "in") {
      const productId = String(body.product_id ?? "");
      const quantity = Number(body.quantity);
      if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
        return NextResponse.json(
          { error: "Enter a valid product and quantity" },
          { status: 400 }
        );
      }

      const { data: batch, error: batchError } = await supabase
        .from("product_batches")
        .insert({
          product_id: productId,
          supplier_id: String(body.supplier_id ?? "").trim() || null,
          batch_number: String(body.batch_number ?? "").trim(),
          expiry_date: String(body.expiry_date ?? "") || null,
          quantity_received: quantity,
          quantity_remaining: quantity,
          purchase_price: Number(body.purchase_price ?? 0),
        })
        .select("id")
        .single();

      if (batchError) {
        return NextResponse.json({ error: batchError.message }, { status: 400 });
      }

      const { error: txError } = await supabase
        .from("inventory_transactions")
        .insert({
          product_id: productId,
          batch_id: batch.id,
          transaction_type: "stock_in",
          quantity,
          reference_no: String(body.reference_no ?? "").trim() || null,
        });

      if (txError) {
        return NextResponse.json({ error: txError.message }, { status: 400 });
      }

      revalidateInventory("stock");
      return NextResponse.json({ ok: true, message: "Stock received" });
    }

    if (action === "out") {
      const productId = String(body.product_id ?? "");
      const requested = Number(body.quantity);
      const unitPrice = Number(body.unit_price ?? 0);

      if (!productId || !Number.isInteger(requested) || requested <= 0) {
        return NextResponse.json(
          { error: "Enter a valid product and quantity" },
          { status: 400 }
        );
      }

      // With a price this is a sale: create the sale record, deduct FIFO,
      // and log sale items so it appears in sales reports and receipts.
      if (unitPrice > 0) {
        const invoiceNumber = generateInvoiceNumber();
        const referenceNo =
          String(body.reference_no ?? "").trim() || invoiceNumber;
        const total = unitPrice * requested;

        const { data: sale, error: saleError } = await supabase
          .from("sales")
          .insert({
            invoice_number: invoiceNumber,
            total_amount: total,
            payment_method: "cash",
          })
          .select("id")
          .single();

        if (saleError) {
          return NextResponse.json(
            { error: saleError.message },
            { status: 400 }
          );
        }

        let allocations;
        try {
          allocations = await deductStockFifo(
            supabase,
            productId,
            requested,
            referenceNo
          );
        } catch (e) {
          await supabase.from("sales").delete().eq("id", sale.id);
          return NextResponse.json(
            { error: (e as Error).message },
            { status: 400 }
          );
        }

        const itemRows = allocations.map((alloc) => ({
          sale_id: sale.id,
          product_id: productId,
          batch_id: alloc.batch_id,
          quantity: alloc.quantity,
          unit_price: unitPrice,
          subtotal: alloc.quantity * unitPrice,
        }));

        let { error: itemError } = await supabase
          .from("sale_items")
          .insert(itemRows);
        // Flat-register schemas have no real batches: batch_id points at the
        // product, which violates the sale_items FK — retry without it.
        if (itemError && itemError.message.includes("batch_id")) {
          ({ error: itemError } = await supabase
            .from("sale_items")
            .insert(itemRows.map((row) => ({ ...row, batch_id: null }))));
        }
        if (itemError) {
          await supabase.from("sales").delete().eq("id", sale.id);
          return NextResponse.json(
            { error: itemError.message },
            { status: 400 }
          );
        }

        let receiptNote = "";
        try {
          const receipt = await issueReceiptForSale(supabase, sale.id);
          receiptNote = ` — receipt ${receipt.receiptNumber}`;
        } catch {
          // Receipt issuing is best-effort; the sale itself is recorded.
        }

        revalidateInventory("stock");
        return NextResponse.json({
          ok: true,
          sale_id: sale.id,
          invoice_number: invoiceNumber,
          message: `Sale recorded (${invoiceNumber})${receiptNote}`,
        });
      }

      const referenceNo =
        String(body.reference_no ?? "").trim() || "stock-out";
      try {
        await deductStockFifo(supabase, productId, requested, referenceNo);
      } catch (e) {
        return NextResponse.json(
          { error: (e as Error).message },
          { status: 400 }
        );
      }

      revalidateInventory("stock");
      return NextResponse.json({ ok: true, message: "Stock dispensed (FIFO)" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Stock operation failed" },
      { status: 500 }
    );
  }
}
