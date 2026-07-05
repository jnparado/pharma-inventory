"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem =
  | { type: "link"; href: string; label: string; icon: string }
  | {
      type: "group";
      label: string;
      icon: string;
      children: { href: string; label: string }[];
    };

const navItems: NavItem[] = [
  {
    type: "link",
    href: "/",
    label: "Dashboard",
    icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  },
  {
    type: "group",
    label: "Purchase",
    icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
    children: [
      { href: "/orders", label: "Purchase Orders" },
      { href: "/suppliers", label: "Suppliers" },
    ],
  },
  {
    type: "group",
    label: "Dispenser",
    icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
    children: [
      { href: "/pos", label: "POS" },
      { href: "/scan", label: "Barcode Scan" },
    ],
  },
  {
    type: "link",
    href: "/products",
    label: "Product",
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  },
  {
    type: "group",
    label: "Reports",
    icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    children: [
      { href: "/reports", label: "Sales Report" },
      { href: "/forecast", label: "Demand Forecast" },
    ],
  },
  {
    type: "group",
    label: "Stock",
    icon: "M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4",
    children: [
      { href: "/stock", label: "Stock In / Out" },
      { href: "/expiry", label: "Expiry Monitor" },
    ],
  },
  {
    type: "link",
    href: "/prescriptions",
    label: "Customer",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    type: "link",
    href: "/suppliers",
    label: "Manufacturer",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
  {
    type: "link",
    href: "/branches",
    label: "Branches",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
  {
    type: "link",
    href: "/assistant",
    label: "AI Assistant",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  },
  {
    type: "link",
    href: "/reports",
    label: "Settings",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Icon({ d }: { d: string }) {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.6}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function SidebarContent() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<string[]>(["Purchase", "Stock"]);

  function toggleGroup(label: string) {
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400 text-sm font-black text-white">
          Rx
        </div>
        <span className="text-lg font-bold text-white">PharmaStock</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-6">
        {navItems.map((item) => {
          if (item.type === "link") {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-900/40"
                    : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <Icon d={item.icon} />
                {item.label}
              </Link>
            );
          }

          const groupActive = item.children.some((c) =>
            isActive(pathname, c.href)
          );
          const expanded = openGroups.includes(item.label) || groupActive;

          return (
            <div key={item.label}>
              <button
                type="button"
                onClick={() => toggleGroup(item.label)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  groupActive
                    ? "text-indigo-400"
                    : "text-slate-400 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon d={item.icon} />
                  {item.label}
                </span>
                <svg
                  className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {expanded && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-700 pl-3">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                        isActive(pathname, child.href)
                          ? "font-medium text-indigo-400"
                          : "text-slate-500 hover:text-slate-200"
                      }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-slate-800 bg-[#10172A] md:flex">
      <SidebarContent />
    </aside>
  );
}

export function MobileNav() {
  return (
    <div className="max-h-64 overflow-y-auto border-b border-slate-800 bg-[#10172A] md:hidden">
      <SidebarContent />
    </div>
  );
}
