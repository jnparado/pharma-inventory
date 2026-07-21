import { cache } from "react";
import { getExpiringBatches, getProductsWithStock } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";

type Candidate = {
  type: string;
  title: string;
  message: string;
};

const DEDUP_WINDOW_DAYS = 7;
const MAX_INSERTS_PER_RUN = 10;

/**
 * Generate low-stock and expiry notifications so the top-bar bell reflects
 * real inventory state. Deduplicates against notifications created in the
 * last week. Cached per request so it runs at most once per render.
 */
export const syncSystemNotifications = cache(async (): Promise<void> => {
  try {
    const supabase = createAdminClient();
    const [products, expiring] = await Promise.all([
      getProductsWithStock(),
      getExpiringBatches(10),
    ]);

    const candidates: Candidate[] = [];

    for (const product of products) {
      const reorderLevel = product.reorder_level ?? 10;
      if (product.total_stock === 0) {
        candidates.push({
          type: "out_of_stock",
          title: `Out of stock: ${product.product_name}`,
          message: `${product.sku} has no remaining stock. Reorder soon.`,
        });
      } else if (product.total_stock <= reorderLevel) {
        candidates.push({
          type: "low_stock",
          title: `Low stock: ${product.product_name}`,
          message: `Only ${product.total_stock} left (reorder level ${reorderLevel}).`,
        });
      }
    }

    for (const batch of expiring) {
      const name = batch.products?.product_name ?? "Unknown product";
      candidates.push({
        type: "expiry",
        title: `Expiring soon: ${name}`,
        message: `Lot ${batch.batch_number} expires ${batch.expiry_date ?? "soon"} (${batch.quantity_remaining ?? 0} left).`,
      });
    }

    if (candidates.length === 0) return;

    const since = new Date();
    since.setDate(since.getDate() - DEDUP_WINDOW_DAYS);
    const { data: recent, error } = await supabase
      .from("notifications")
      .select("title")
      .gte("created_at", since.toISOString())
      .limit(500);
    if (error) return;

    const existingTitles = new Set((recent ?? []).map((n) => n.title));
    const fresh = candidates
      .filter((c) => !existingTitles.has(c.title))
      .slice(0, MAX_INSERTS_PER_RUN);

    if (fresh.length === 0) return;

    await supabase
      .from("notifications")
      .insert(fresh.map((c) => ({ ...c, is_read: false })));
  } catch (e) {
    console.error("syncSystemNotifications:", e);
  }
});
