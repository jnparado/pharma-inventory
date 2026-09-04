import { unstable_cache } from "next/cache";

export const CACHE_TAGS = {
  inventory: "inventory",
  products: "products",
  suppliers: "suppliers",
  customers: "customers",
  transactions: "transactions",
  notifications: "notifications",
  sales: "sales",
  dashboard: "dashboard",
  orders: "orders",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

const DEFAULT_REVALIDATE_SECONDS = 30;

export function cachedQuery<TResult>(
  key: string[],
  fn: () => Promise<TResult>,
  tags: CacheTag[],
  revalidate = DEFAULT_REVALIDATE_SECONDS
): () => Promise<TResult> {
  return unstable_cache(fn, key, { revalidate, tags });
}
