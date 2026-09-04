"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { SidebarContent } from "@/components/sidebar";

type MobileNavContextValue = {
  open: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
};

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) {
    throw new Error("useMobileNav must be used within AppShell");
  }
  return ctx;
}

function RouteChangeCloser({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const closeMenu = useCallback(() => setOpen(false), []);
  const openMenu = useCallback(() => setOpen(true), []);
  const toggleMenu = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeMenu]);

  useEffect(() => {
    function onResize() {
      if (window.matchMedia("(min-width: 768px)").matches) {
        closeMenu();
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [closeMenu]);

  const value: MobileNavContextValue = {
    open,
    openMenu,
    closeMenu,
    toggleMenu,
  };

  return (
    <MobileNavContext.Provider value={value}>
      <RouteChangeCloser onClose={closeMenu} />
      <div className="min-h-screen md:grid md:grid-cols-[13rem_minmax(0,1fr)]">
        {/* Desktop sidebar — in document flow so main content cannot block clicks */}
        <aside className="hidden min-h-screen border-r border-slate-700/80 bg-slate-800 md:sticky md:top-0 md:flex md:h-screen md:flex-col md:overflow-hidden">
          <SidebarContent />
        </aside>

        {/* Mobile drawer */}
        <div
          className={`fixed inset-0 z-50 md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
          aria-hidden={!open}
        >
          <button
            type="button"
            className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
              open ? "opacity-100" : "opacity-0"
            }`}
            aria-label="Close menu"
            onClick={closeMenu}
            tabIndex={open ? 0 : -1}
          />
          <aside
            className={`absolute inset-y-0 left-0 flex h-full w-[min(100vw,18rem)] flex-col border-r border-slate-700/80 bg-slate-800 shadow-xl transition-transform duration-300 ease-out ${
              open ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-700/80 px-4 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">
                  Rx
                </div>
                <span className="text-base font-semibold text-white">
                  PharmaStock
                </span>
              </div>
              <button
                type="button"
                onClick={closeMenu}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarContent onNavigate={closeMenu} hideBrand />
          </aside>
        </div>

        <div className="flex min-h-screen min-w-0 flex-col">{children}</div>
      </div>
    </MobileNavContext.Provider>
  );
}
