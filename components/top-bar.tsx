"use client";

import { useEffect, useRef, useState } from "react";
import {
  markAllNotificationsRead,
  markNotificationRead,
  setActiveUser,
} from "@/app/actions/user";
import { useMobileNav } from "@/components/app-shell";
import type { Notification, User } from "@/lib/types";
import { formatDateTime, formatDisplayName, getInitials } from "@/lib/utils";

export function TopBar({
  user,
  users = [],
  notifications = [],
  unreadCount = 0,
}: {
  user: User | null;
  users?: User[];
  notifications?: Notification[];
  unreadCount?: number;
}) {
  const { toggleMenu } = useMobileNav();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const initials = user ? getInitials(user.full_name) : "?";
  const displayName = user ? formatDisplayName(user.full_name) : "No user";
  const role = user?.role ?? "—";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function switchUser(userId: string) {
    await setActiveUser(userId);
    setShowUserMenu(false);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-700/60 bg-[#151f33]">
      {/* Row 1: menu + actions */}
      <div className="flex items-center justify-between gap-2 px-3 py-3 sm:px-4 md:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={toggleMenu}
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 md:hidden"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="truncate text-sm font-semibold text-slate-200 md:hidden">
            PharmaStock
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setShowNotifications((v) => !v);
                setShowUserMenu(false);
              }}
              className="relative rounded-xl p-2 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
              aria-label="Notifications"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 pb-2">
                  <p className="text-sm font-semibold text-slate-800">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                        {unreadCount}
                      </span>
                    )}
                  </p>
                  {unreadCount > 0 && (
                    <form action={markAllNotificationsRead}>
                      <button type="submit" className="text-xs text-teal-600 hover:underline">
                        Mark all read
                      </button>
                    </form>
                  )}
                </div>
                <ul className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <li className="px-4 py-6 text-center text-sm text-slate-400">
                      No notifications
                    </li>
                  ) : (
                    notifications.map((n) => (
                      <li
                        key={n.id}
                        className={`border-b border-slate-100 px-4 py-3 last:border-0 ${
                          !n.is_read ? "bg-teal-50/50" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800">{n.title}</p>
                            {n.message && (
                              <p className="mt-0.5 text-xs text-slate-500">{n.message}</p>
                            )}
                            {n.created_at && (
                              <p className="mt-1 text-[10px] text-slate-400">
                                {formatDateTime(n.created_at)}
                              </p>
                            )}
                          </div>
                          {!n.is_read && (
                            <form action={markNotificationRead}>
                              <input type="hidden" name="id" value={n.id} />
                              <button
                                type="submit"
                                className="shrink-0 text-[10px] text-teal-600 hover:underline"
                              >
                                Read
                              </button>
                            </form>
                          )}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>

          <div className="relative" ref={userRef}>
            <button
              type="button"
              onClick={() => {
                if (users.length > 0) setShowUserMenu((v) => !v);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-700/30 py-1 pl-1 pr-2 sm:gap-2.5 sm:pr-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-sm font-semibold text-teal-300 sm:h-9 sm:w-9">
                {initials}
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold leading-tight text-slate-100">
                  {displayName}
                </p>
                <p className="truncate text-xs text-slate-400">{role}</p>
              </div>
            </button>

            {showUserMenu && users.length > 0 && (
              <div className="absolute right-0 z-50 mt-2 w-[min(14rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
                <p className="px-4 pb-2 text-xs font-medium uppercase text-slate-400">
                  Switch user
                </p>
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => switchUser(u.id)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                      user?.id === u.id ? "bg-teal-50 text-teal-700" : "text-slate-700"
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-xs font-semibold text-teal-700">
                      {getInitials(u.full_name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{u.full_name}</span>
                      <span className="block truncate text-xs text-slate-400">{u.role}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: search (full width on mobile, inline on desktop) */}
      <div className="border-t border-slate-700/40 px-3 pb-3 md:border-t-0 md:px-8 md:pb-3">
        <div className="relative mx-auto min-w-0 md:max-w-md">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            placeholder="Search products, SKU, invoices…"
            className="w-full rounded-xl border border-slate-600 bg-[#10172A] py-2 pl-10 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>
    </header>
  );
}
