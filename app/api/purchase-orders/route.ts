import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/permissions";
import { convertPurchaseOrderToSalesInvoice } from "@/lib/purchase-order-invoice";
import {
  autoGeneratePurchaseOrder,
  insertPurchaseOrder,
  type PoLineInput,
} from "@/lib/purchase-orders";
import { revalidateInventory } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRoleKey } from "@/lib/env";
import { getActiveUser } from "@/lib/user-session";

async function finalizePurchaseOrder(
  supabase: ReturnType<typeof createAdminClient>,
  poId: string,
  poNumber: string
) {
  const convert = await convertPurchaseOrderToSalesInvoice(supabase, poId);
  if (!convert.ok) {
    await supabase.from("purchase_order_items").delete().eq("purchase_order_id", poId);
    await supabase.from("purchase_orders").delete().eq("id", poId);
    return { ok: false as const, error: convert.error };
  }

  revalidateInventory("orders", "stock", "sales", "products");
  return {
    ok: true as const,
    id: poId,
    po_number: poNumber,
    invoice_number: convert.invoiceNumber,
    message: convert.alreadyExists
      ? `PO ${poNumber} linked to Sales Invoice ${convert.invoiceNumber}`
      : `PO ${poNumber} created — Sales Invoice ${convert.invoiceNumber} and inventory updated`,
  };
}

export async function POST(request: Request) {
  const user = await getActiveUser();
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY is missing. Add it in Vercel env vars, then redeploy.",
      },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as {
      mode?: "manual" | "auto";
      supplier_id?: string | null;
      notes?: string | null;
      items?: PoLineInput[];
    };

    const supabase = createAdminClient();
    const supplierId = body.supplier_id?.trim() || null;

    if (body.mode === "auto") {
      const result = await autoGeneratePurchaseOrder(supabase, supplierId);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      const finalized = await finalizePurchaseOrder(
        supabase,
        result.id,
        result.po_number
      );
      if (!finalized.ok) {
        return NextResponse.json({ error: finalized.error }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        id: finalized.id,
        po_number: finalized.po_number,
        invoice_number: finalized.invoice_number,
        message: `${finalized.message} (${result.itemCount} items)`,
      });
    }

    const items = body.items ?? [];
    const result = await insertPurchaseOrder(supabase, {
      supplier_id: supplierId,
      items,
      notes: body.notes ?? null,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const finalized = await finalizePurchaseOrder(
      supabase,
      result.id,
      result.po_number
    );
    if (!finalized.ok) {
      return NextResponse.json({ error: finalized.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      id: finalized.id,
      po_number: finalized.po_number,
      invoice_number: finalized.invoice_number,
      message: finalized.message,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not create purchase order" },
      { status: 500 }
    );
  }
}
