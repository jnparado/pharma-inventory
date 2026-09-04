import { createAdminClient } from "@/lib/supabase/admin";
import type { Customer, ProductWithStock, SaleWithItems, Supplier } from "@/lib/types";

function ilikePattern(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return "%";
  const escaped = trimmed.replace(/[%_\\]/g, "\\$&");
  return `%${escaped}%`;
}

function orIlike(fields: string[], pattern: string): string {
  return fields.map((field) => `${field}.ilike.${pattern}`).join(",");
}

async function stockTotalsByProduct(
  supabase: ReturnType<typeof createAdminClient>,
  productIds: string[]
): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  if (productIds.length === 0) return totals;

  const { data: batches } = await supabase
    .from("product_batches")
    .select("product_id, quantity_remaining")
    .in("product_id", productIds);

  for (const batch of batches ?? []) {
    if (!batch.product_id) continue;
    totals.set(
      batch.product_id,
      (totals.get(batch.product_id) ?? 0) + (batch.quantity_remaining ?? 0)
    );
  }

  return totals;
}

export async function searchInventory(query: string): Promise<{
  products: ProductWithStock[];
  sales: SaleWithItems[];
  suppliers: Supplier[];
  customers: Customer[];
}> {
  const pattern = ilikePattern(query);
  const supabase = createAdminClient();

  const [productsRes, salesRes, suppliersRes, customersRes] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .or(
        orIlike(
          ["product_name", "sku", "barcode", "generic_name", "brand_name"],
          pattern
        )
      )
      .order("product_name")
      .limit(20),
    supabase
      .from("sales")
      .select(
        "id, invoice_number, receipt_number, total_amount, created_at, payment_method"
      )
      .or(orIlike(["invoice_number", "receipt_number"], pattern))
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("suppliers")
      .select("*")
      .or(orIlike(["company_name", "contact_person", "email", "phone"], pattern))
      .order("company_name")
      .limit(10),
    supabase
      .from("customers")
      .select("*")
      .or(orIlike(["full_name", "email", "phone"], pattern))
      .order("full_name")
      .limit(10),
  ]);

  const rawProducts = productsRes.data ?? [];
  const stockByProduct = await stockTotalsByProduct(
    supabase,
    rawProducts.map((p) => String(p.id))
  );

  const products = rawProducts.map((product) => {
    const flatQty = Number(
      (product as { quantity?: number }).quantity ?? 0
    );
    const batchStock = stockByProduct.get(String(product.id)) ?? 0;
    return {
      ...(product as ProductWithStock),
      categories: null,
      total_stock: batchStock > 0 ? batchStock : flatQty,
      nearest_expiry: null,
    };
  });

  return {
    products,
    sales: (salesRes.data ?? []) as unknown as SaleWithItems[],
    suppliers: (suppliersRes.data ?? []) as Supplier[],
    customers: (customersRes.data ?? []) as Customer[],
  };
}
