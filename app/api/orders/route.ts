import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-admin";
import { convertPurchaseOrderToSalesInvoice } from "@/lib/purchase-order-invoice";
import { hasServiceRoleKey } from "@/lib/env";
import { revalidateInventory } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PUT(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is missing on the server." },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "");
    const status = String(body.status ?? "");
    if (!id) {
      return NextResponse.json({ error: "Missing order id" }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (status === "approved") {
      let result;
      try {
        result = await convertPurchaseOrderToSalesInvoice(supabase, id);
      } catch (e) {
        return NextResponse.json(
          { error: (e as Error).message ?? "Approval failed" },
          { status: 400 }
        );
      }

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      revalidateInventory("orders", "sales", "stock");
      const message = result.alreadyExists
        ? `Receipt ${result.receiptNumber} issued (Invoice ${result.invoiceNumber})`
        : `Invoice ${result.invoiceNumber} converted to Receipt ${result.receiptNumber}`;

      return NextResponse.json({
        ok: true,
        message,
        redirect: `/receipt/${result.saleId}?success=${encodeURIComponent(message)}`,
        status: "approved",
      });
    }

    const { error } = await supabase
      .from("purchase_orders")
      .update({ status })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    revalidateInventory("orders");
    return NextResponse.json({
      ok: true,
      message: "Order status updated",
      status,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not update order" },
      { status: 500 }
    );
  }
}
