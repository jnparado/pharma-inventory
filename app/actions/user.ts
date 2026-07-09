"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setActiveUser(userId: string) {
  const cookieStore = await cookies();
  cookieStore.delete("signed_out");
  cookieStore.set("active_user_id", userId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

export async function setActiveUserFromForm(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return;
  await setActiveUser(userId);
  revalidatePath("/settings");
  revalidatePath("/profile");
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("active_user_id");
  cookieStore.set("signed_out", "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateUserProfile(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (!id || !full_name || !email || !role) {
    redirect("/profile?error=Please fill in all required fields");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({ full_name, email, role })
    .eq("id", id);

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  revalidatePath("/profile");
  redirect("/profile?success=Profile updated successfully");
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
