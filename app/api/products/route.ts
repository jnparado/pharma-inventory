import { NextResponse } from "next/server";
import { revalidateInventory } from "@/lib/revalidate";
import { isAdmin } from "@/lib/permissions";
import {
  insertProductEntry,
  parseProductEntryBody,
  updateProductEntry,
  validateProductEntry,
} from "@/lib/products-db";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveUser } from "@/lib/user-session";

async function requireAdminApi() {
  const user = await getActiveUser();
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  return null;
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const input = parseProductEntryBody(body);
    const validationError = validateProductEntry(input);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await insertProductEntry(supabase, input);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    revalidateInventory("products", "stock", "dashboard");
    return NextResponse.json({ ok: true, message: "Product added" });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not add product" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const batchId = String(body.batch_id ?? "");
    const productId = String(body.product_id ?? "");
    if (!batchId || !productId) {
      return NextResponse.json(
        { error: "Missing product entry id" },
        { status: 400 }
      );
    }

    const input = parseProductEntryBody(body);
    const validationError = validateProductEntry(input);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await updateProductEntry(
      supabase,
      batchId,
      productId,
      input
    );
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    revalidateInventory("products", "stock", "dashboard");
    return NextResponse.json({ ok: true, message: "Product updated" });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not update product" },
      { status: 500 }
    );
  }
}
