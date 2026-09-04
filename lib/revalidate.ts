import { after } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS, type CacheTag } from "@/lib/query-cache";

const GROUPS = {
  products: ["/products", "/stock", "/expiry", "/pos", "/scan", "/forecast"],
  suppliers: ["/suppliers", "/orders"],
  customers: ["/customers", "/pos"],
  stock: ["/", "/stock", "/expiry", "/products", "/pos", "/scan"],
  branches: ["/branches"],
  orders: ["/orders"],
  sales: ["/", "/reports", "/pos"],
  prescriptions: ["/prescriptions"],
  dashboard: ["/"],
} as const;

export type RevalidateGroup = keyof typeof GROUPS;

const GROUP_TAGS: Record<RevalidateGroup, CacheTag[]> = {
  products: [CACHE_TAGS.inventory, CACHE_TAGS.products],
  suppliers: [CACHE_TAGS.suppliers],
  customers: [CACHE_TAGS.customers, CACHE_TAGS.dashboard],
  stock: [
    CACHE_TAGS.inventory,
    CACHE_TAGS.products,
    CACHE_TAGS.transactions,
    CACHE_TAGS.dashboard,
  ],
  branches: [],
  orders: [
    CACHE_TAGS.orders,
    CACHE_TAGS.inventory,
    CACHE_TAGS.products,
    CACHE_TAGS.sales,
    CACHE_TAGS.dashboard,
  ],
  sales: [CACHE_TAGS.sales, CACHE_TAGS.dashboard],
  prescriptions: [],
  dashboard: [CACHE_TAGS.dashboard],
};

/** Fast path: refresh product register after CRUD (deferred until after response). */
export function revalidateProductsPage() {
  after(() => {
    revalidatePath("/products");
    revalidateTag(CACHE_TAGS.inventory, "max");
    revalidateTag(CACHE_TAGS.products, "max");
  });
}

/** Invalidate only routes affected by a mutation (deferred until after response). */
export function revalidateInventory(...groups: RevalidateGroup[]) {
  const paths: string[] = [];
  const tags = new Set<CacheTag>();
  const seen = new Set<string>();
  for (const group of groups) {
    for (const tag of GROUP_TAGS[group]) {
      tags.add(tag);
    }
    for (const path of GROUPS[group]) {
      if (seen.has(path)) continue;
      seen.add(path);
      paths.push(path);
    }
  }
  if (paths.length === 0 && tags.size === 0) return;
  after(() => {
    for (const tag of tags) {
      revalidateTag(tag, "max");
    }
    for (const path of paths) {
      revalidatePath(path);
    }
  });
}

/** Defer user/profile path revalidation after mutations. */
export function revalidateUserPaths(path?: string) {
  after(() => {
    if (path) {
      revalidatePath(path);
      return;
    }
    revalidatePath("/profile");
    revalidatePath("/settings");
    revalidatePath("/users");
  });
}
