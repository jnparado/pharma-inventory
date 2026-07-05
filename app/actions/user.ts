"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setActiveUser(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set("active_user_id", userId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export async function markNotificationRead(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createAdminClient();
  await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const supabase = createAdminClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false);
  revalidatePath("/", "layout");
}
