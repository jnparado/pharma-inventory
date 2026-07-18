import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/permissions";
import { getActiveUser } from "@/lib/user-session";

export async function requireAdminApi() {
  const user = await getActiveUser();
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  return null;
}
