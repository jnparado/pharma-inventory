"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const PREFETCH_ROUTES = [
  "/",
  "/products",
  "/stock",
  "/expiry",
  "/reports",
  "/customers",
  "/suppliers",
  "/users",
  "/settings",
] as const;

/** Warm RSC payloads for main nav routes so sidebar clicks feel instant. */
export function SidebarPrefetch() {
  const router = useRouter();

  useEffect(() => {
    for (const href of PREFETCH_ROUTES) {
      router.prefetch(href);
    }
  }, [router]);

  return null;
}
