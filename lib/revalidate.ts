import { after } from "next/server";
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

/** Fast path: refresh product register after CRUD (deferred until after response). */
export function revalidateProductsPage() {
  after(() => {
    revalidatePath("/products");
  });
}

/** Invalidate only routes affected by a mutation (deferred until after response). */
export function revalidateInventory(...groups: RevalidateGroup[]) {
  const paths: string[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const path of GROUPS[group]) {
      if (seen.has(path)) continue;
      seen.add(path);
      paths.push(path);
    }
  }
  if (paths.length === 0) return;
  after(() => {
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
