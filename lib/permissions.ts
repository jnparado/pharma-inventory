import type { User } from "@/lib/types";

export const USER_ROLES = [
  "admin",
  "manager",
  "pharmacist",
  "cashier",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isAdmin(user: User | null | undefined): boolean {
  return user?.role?.toLowerCase() === "admin";
}

export function canManageRecords(user: User | null | undefined): boolean {
  return isAdmin(user);
}
