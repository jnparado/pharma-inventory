"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  markAllNotificationsRead,
  markNotificationRead,
  signOut,
} from "@/app/actions/user";
import { useMobileNav } from "@/components/app-shell";
import type { Notification, User } from "@/lib/types";
import { formatDateTime, formatDisplayName, getInitials } from "@/lib/utils";

export function TopBar({
  user,
  notifications = [],
  unreadCount = 0,
}: {
  user: User | null;
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

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="flex w-full items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleMenu}
            className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 md:hidden"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <form
            action="/search"
            className="relative min-w-0 w-full max-w-xl lg:max-w-2xl"
            role="search"
          >
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
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
              name="q"
              placeholder="Search products, SKU, invoices…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </form>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setShowNotifications((v) => !v);
                setShowUserMenu(false);
              }}
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
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
                setShowUserMenu((v) => !v);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-1 pl-1 pr-2 sm:gap-2.5 sm:pr-3 hover:bg-slate-100"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-sm font-semibold text-white sm:h-9 sm:w-9">
                {initials}
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold leading-tight text-slate-900">
                  {displayName}
                </p>
                <p className="truncate text-xs text-slate-500">{role}</p>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 z-50 mt-2 w-[min(16rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-sm font-semibold text-teal-700">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {user.full_name}
                        </p>
                        <p className="truncate text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        My Profile
                      </Link>
                      <Link
                        href="/profile#edit"
                        onClick={() => setShowUserMenu(false)}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Profile
                      </Link>
                      {user.role?.toLowerCase() === "admin" && (
                        <Link
                          href="/users"
                          onClick={() => setShowUserMenu(false)}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          Manage User Accounts
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-slate-100 py-1">
                      <form action={signOut}>
                        <button
                          type="submit"
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign out
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="py-2">
                    <p className="px-4 py-2 text-sm text-slate-500">
                      Profile not linked. Contact an admin.
                    </p>
                    <Link
                      href="/login"
                      className="block px-4 py-2 text-sm font-medium text-teal-600 hover:bg-slate-50"
                    >
                      Sign in again
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
