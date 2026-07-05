import { cookies } from "next/headers";
import { getUsers } from "@/lib/data";
import type { User } from "@/lib/types";

export async function getActiveUser(): Promise<User | null> {
  const users = await getUsers();
  if (users.length === 0) return null;

  const cookieStore = await cookies();
  const activeId = cookieStore.get("active_user_id")?.value;
  const match = users.find((u) => u.id === activeId);
  if (match) return match;

  const admin = users.find((u) => u.role?.toLowerCase() === "admin");
  return admin ?? users[0];
}
