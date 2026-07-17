import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/permissions";
import {
  autoGeneratePurchaseOrder,
  insertPurchaseOrder,
  type PoLineInput,
} from "@/lib/purchase-orders";
import { revalidateInventory } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRoleKey } from "@/lib/env";
import { getActiveUser } from "@/lib/user-session";

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

      revalidateInventory("orders");
      return NextResponse.json({
        ok: true,
        id: result.id,
        po_number: result.po_number,
        message: `Auto PO ${result.po_number} created (${result.itemCount} items)`,
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

    revalidateInventory("orders");
    return NextResponse.json({
      ok: true,
      id: result.id,
      po_number: result.po_number,
      message: `Purchase order ${result.po_number} created`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not create purchase order" },
      { status: 500 }
    );
  }
}
