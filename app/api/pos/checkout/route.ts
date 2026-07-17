import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { issueReceiptForSale } from "@/lib/receipt";
import { createAdminClient } from "@/lib/supabase/admin";
import { deductStockFifo, generateInvoiceNumber } from "@/lib/pos";

type CartItem = {
  product_id: string;
  quantity: number;
  unit_price: number;
};

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const body = (await req.json()) as {
    items: CartItem[];
    payment_method: string;
    amount_paid?: number;
  };

  if (!body.items?.length) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const invoiceNumber = generateInvoiceNumber();
  const total = body.items.reduce(
    (sum, i) => sum + i.quantity * i.unit_price,
    0
  );

  try {
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        invoice_number: invoiceNumber,
        total_amount: total,
        payment_method: body.payment_method || "cash",
      })
      .select("id")
      .single();

    if (saleError) throw new Error(saleError.message);

    const allocationsByItem = await Promise.all(
      body.items.map((item) =>
        deductStockFifo(
          supabase,
          item.product_id,
          item.quantity,
          invoiceNumber
        ).then((allocations) => ({ item, allocations }))
      )
    );

    const saleItems = allocationsByItem.flatMap(({ item, allocations }) =>
      allocations.map((alloc) => ({
        sale_id: sale.id,
        product_id: item.product_id,
        batch_id: alloc.batch_id,
        quantity: alloc.quantity,
        unit_price: item.unit_price,
        subtotal: alloc.quantity * item.unit_price,
      }))
    );

    if (saleItems.length > 0) {
      const { error: itemError } = await supabase
        .from("sale_items")
        .insert(saleItems);
      if (itemError) throw new Error(itemError.message);
    }

    const paid = body.amount_paid ?? total;
    const receipt = await issueReceiptForSale(supabase, sale.id);

    return NextResponse.json({
      success: true,
      sale_id: sale.id,
      invoice_number: invoiceNumber,
      receipt_number: receipt.receiptNumber,
      total,
      change: Math.max(0, paid - total),
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 }
    );
  }
}
