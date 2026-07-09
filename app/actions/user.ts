"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { getUserById } from "@/lib/data";
import { isAdmin } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveUser } from "@/lib/user-session";

function revalidateUserPaths() {
  revalidatePath("/", "layout");
  for (const path of ["/profile", "/settings", "/users"]) {
    revalidatePath(path);
  }
}

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
  const roleInput = String(formData.get("role") ?? "").trim();

  if (!id || !full_name || !email) {
    redirect("/profile?error=Please fill in all required fields");
  }

  const activeUser = await getActiveUser();
  if (!activeUser || activeUser.id !== id) {
    redirect("/profile?error=You can only edit your own profile");
  }

  const existing = await getUserById(id);
  if (!existing) redirect("/profile?error=User not found");

  const role = isAdmin(activeUser) ? roleInput || existing.role : existing.role;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("users")
    .update({ full_name, email, role })
    .eq("id", id);

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  revalidateUserPaths();
  redirect("/profile?success=Profile updated successfully");
}

export async function createUser(formData: FormData) {
  await requireAdmin("/users");
  const supabase = createAdminClient();

  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "cashier").trim();
  const branch_id = String(formData.get("branch_id") ?? "").trim() || null;

  if (!full_name || !email) {
    redirect("/users?error=Name and email are required");
  }

  const base = { full_name, email, role };
  let { error } = await supabase.from("users").insert({
    ...base,
    branch_id,
  });

  if (error && branch_id && error.message.toLowerCase().includes("branch_id")) {
    ({ error } = await supabase.from("users").insert(base));
  }

  if (error) redirect(`/users?error=${encodeURIComponent(error.message)}`);
  revalidateUserPaths();
  redirect("/users?success=User account created");
}

export async function updateUser(formData: FormData) {
  const admin = await requireAdmin("/users");
  const supabase = createAdminClient();

  const id = String(formData.get("id") ?? "");
  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const branch_id = String(formData.get("branch_id") ?? "").trim() || null;

  if (!id || !full_name || !email || !role) {
    redirect("/users?error=Please fill in all required fields");
  }

  if (id === admin.id && role !== "admin") {
    redirect("/users?error=You cannot remove your own admin role");
  }

  const base = { full_name, email, role };
  let { error } = await supabase
    .from("users")
    .update({ ...base, branch_id })
    .eq("id", id);

  if (error && error.message.toLowerCase().includes("branch_id")) {
    ({ error } = await supabase.from("users").update(base).eq("id", id));
  }

  if (error) redirect(`/users?error=${encodeURIComponent(error.message)}`);
  revalidateUserPaths();
  redirect("/users?success=User account updated");
}

export async function deleteUser(formData: FormData) {
  const admin = await requireAdmin("/users");
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");

  if (!id) redirect("/users?error=Missing user id");
  if (id === admin.id) {
    redirect("/users?error=You cannot delete your own account");
  }

  const { data: allUsers } = await supabase.from("users").select("id, role");
  const target = allUsers?.find((u) => u.id === id);
  const adminCount =
    allUsers?.filter((u) => u.role?.toLowerCase() === "admin").length ?? 0;
  if (target?.role?.toLowerCase() === "admin" && adminCount <= 1) {
    redirect("/users?error=Cannot delete the only admin account");
  }

  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) redirect(`/users?error=${encodeURIComponent(error.message)}`);

  const cookieStore = await cookies();
  if (cookieStore.get("active_user_id")?.value === id) {
    cookieStore.delete("active_user_id");
  }

  revalidateUserPaths();
  redirect("/users?success=User account removed");
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
