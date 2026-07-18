import { NextResponse } from "next/server";
import { revalidateProductsPage } from "@/lib/revalidate";
import { isAdmin } from "@/lib/permissions";
import {
  deleteProductEntry,
  insertProductEntry,
  parseProductEntryBody,
  productLineFromInput,
  updateProductEntry,
  validateProductEntry,
} from "@/lib/products-db";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRoleKey } from "@/lib/env";
import { getActiveUser } from "@/lib/user-session";
import type { ProductInventoryLine } from "@/lib/types";

async function requireAdminApi() {
  const user = await getActiveUser();
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  return null;
}

function lineResponse(
  input: ReturnType<typeof parseProductEntryBody>,
  productId: string,
  batchId: string,
  supplierName?: string | null
): ProductInventoryLine {
  return productLineFromInput(
    input,
    { productId, batchId },
    { supplier_name: supplierName ?? null }
  );
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    if (!hasServiceRoleKey()) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY is missing on Vercel. Add it under Project Settings → Environment Variables, then redeploy.",
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const input = parseProductEntryBody(body);
    const validationError = validateProductEntry(input);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error, productId, batchId } = await insertProductEntry(supabase, input);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    revalidateProductsPage();

    const id = productId ?? "";
    const bid = batchId ?? productId ?? "";
    return NextResponse.json({
      ok: true,
      message: "Product added",
      line: lineResponse(input, id, bid, body.supplier_name as string | undefined),
    });
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
    if (!hasServiceRoleKey()) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY is missing on Vercel. Add it under Project Settings → Environment Variables, then redeploy.",
        },
        { status: 503 }
      );
    }

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

    revalidateProductsPage();

    return NextResponse.json({
      ok: true,
      message: "Product updated",
      line: lineResponse(
        input,
        productId,
        batchId,
        body.supplier_name as string | undefined
      ),
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    if (!hasServiceRoleKey()) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY is missing on Vercel. Add it under Project Settings → Environment Variables, then redeploy.",
        },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const batchId = String(searchParams.get("batch_id") ?? "");
    const productId = String(searchParams.get("product_id") ?? "");
    if (!batchId || !productId) {
      return NextResponse.json(
        { error: "Missing product entry id" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { error } = await deleteProductEntry(supabase, productId, batchId);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    revalidateProductsPage();
    return NextResponse.json({
      ok: true,
      message: "Product removed",
      batch_id: batchId,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not delete product" },
      { status: 500 }
    );
  }
}
