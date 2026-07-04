import { createAdminClient } from "@/lib/supabase/admin";
import type { ProductWithStock } from "@/lib/types";

export async function buildInventoryContext(): Promise<string> {
  const supabase = createAdminClient();

  const [productsRes, batchesRes, suppliersRes, branchesRes, ordersRes] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, product_name, sku, reorder_level, selling_price, categories(name)")
        .limit(50),
      supabase
        .from("product_batches")
        .select("product_id, quantity_remaining, expiry_date")
        .gt("quantity_remaining", 0),
      supabase.from("suppliers").select("company_name").limit(20),
      supabase.from("branches").select("name, address").limit(10),
      supabase
        .from("purchase_orders")
        .select("po_number, status")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const stockByProduct = new Map<string, number>();
  const expiringSoon: string[] = [];
  const today = new Date();
  const in90 = new Date(today);
  in90.setDate(in90.getDate() + 90);

  for (const b of batchesRes.data ?? []) {
    if (!b.product_id) continue;
    stockByProduct.set(
      b.product_id,
      (stockByProduct.get(b.product_id) ?? 0) + (b.quantity_remaining ?? 0)
    );
    if (b.expiry_date && new Date(b.expiry_date) <= in90) {
      expiringSoon.push(`${b.product_id}: expires ${b.expiry_date}, qty ${b.quantity_remaining}`);
    }
  }

  const lowStock = (productsRes.data ?? [])
    .map((p) => ({
      name: p.product_name,
      sku: p.sku,
      stock: stockByProduct.get(p.id as string) ?? 0,
      reorder: p.reorder_level ?? 0,
      category: (p.categories as unknown as { name: string } | null)?.name,
    }))
    .filter((p) => p.stock <= p.reorder);

  return JSON.stringify(
    {
      low_stock_products: lowStock.slice(0, 15),
      expiring_batches: expiringSoon.slice(0, 10),
      suppliers: (suppliersRes.data ?? []).map((s) => s.company_name),
      branches: branchesRes.data ?? [],
      recent_orders: ordersRes.data ?? [],
      total_products: productsRes.data?.length ?? 0,
    },
    null,
    2
  );
}

export async function matchPrescriptionMedicines(
  medicineNames: string[],
  products: ProductWithStock[]
) {
  return medicineNames.map((medicine) => {
    const lower = medicine.toLowerCase();
    const match = products.find(
      (p) =>
        p.product_name.toLowerCase().includes(lower) ||
        p.generic_name?.toLowerCase().includes(lower) ||
        p.brand_name?.toLowerCase().includes(lower) ||
        lower.includes(p.generic_name?.toLowerCase() ?? "___")
    );

    const alternatives = products
      .filter(
        (p) =>
          p.id !== match?.id &&
          p.categories?.name === match?.categories?.name &&
          p.total_stock > 0
      )
      .slice(0, 3)
      .map((p) => `${p.product_name} (${p.total_stock} in stock)`);

    if (!match) {
      const fuzzy = products
        .filter(
          (p) =>
            p.product_name.toLowerCase().includes(lower.split(" ")[0]) ||
            p.generic_name?.toLowerCase().includes(lower.split(" ")[0])
        )
        .slice(0, 3)
        .map((p) => `${p.product_name} (${p.total_stock} in stock)`);

      return {
        medicine,
        in_stock: false,
        available_qty: 0,
        product_id: null,
        product_name: null,
        alternatives: fuzzy,
      };
    }

    return {
      medicine,
      in_stock: match.total_stock > 0,
      available_qty: match.total_stock,
      product_id: match.id,
      product_name: match.product_name,
      alternatives,
    };
  });
}
