"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

export function ShellGate({
  children,
  topBar,
}: {
  children: ReactNode;
  topBar: ReactNode;
}) {
  const pathname = usePathname();
  const isAuthRoute = pathname === "/login" || pathname.startsWith("/auth/");

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <AppShell>
      {topBar}
      <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-8">{children}</main>
    </AppShell>
  );
}
