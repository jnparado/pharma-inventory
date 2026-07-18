import { NextResponse } from "next/server";
import { hasServiceRoleKey } from "@/lib/env";
import { deductStockFifo } from "@/lib/pos";
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
      const referenceNo =
        String(body.reference_no ?? "").trim() || "stock-out";

      if (!productId || !Number.isInteger(requested) || requested <= 0) {
        return NextResponse.json(
          { error: "Enter a valid product and quantity" },
          { status: 400 }
        );
      }

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
