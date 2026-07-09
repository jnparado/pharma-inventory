import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/permissions";
import { getActiveUser } from "@/lib/user-session";
import type { User } from "@/lib/types";

export async function requireAdmin(returnPath: string): Promise<User> {
  const user = await getActiveUser();
  if (!isAdmin(user)) {
    redirect(
      `${returnPath}?error=${encodeURIComponent("Admin access required")}`
    );
  }
  return user!;
}
