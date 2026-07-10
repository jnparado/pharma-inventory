import { revalidatePath } from "next/cache";

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

/** Invalidate only routes affected by a mutation (not the whole app). */
export function revalidateInventory(...groups: RevalidateGroup[]) {
  const seen = new Set<string>();
  for (const group of groups) {
    for (const path of GROUPS[group]) {
      if (seen.has(path)) continue;
      seen.add(path);
      revalidatePath(path);
    }
  }
}
