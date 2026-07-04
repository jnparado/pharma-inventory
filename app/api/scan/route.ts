import { NextResponse } from "next/server";
import { getProductByCode, isSupabaseConfigured } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const code = new URL(req.url).searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "code parameter required" }, { status: 400 });
  }

  try {
    const product = await getProductByCode(code);
    if (!product) {
      return NextResponse.json({ found: false, code });
    }

    const supabase = createAdminClient();
    const { data: batches } = await supabase
      .from("product_batches")
      .select("batch_number, expiry_date, quantity_remaining")
      .eq("product_id", product.id)
      .gt("quantity_remaining", 0)
      .order("expiry_date");

    const totalStock = (batches ?? []).reduce(
      (s, b) => s + (b.quantity_remaining ?? 0),
      0
    );

    return NextResponse.json({
      found: true,
      product: {
        id: product.id,
        product_name: product.product_name,
        sku: product.sku,
        barcode: product.barcode,
        unit: product.unit,
        selling_price: product.selling_price,
        total_stock: totalStock,
      },
      batches: batches ?? [],
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
