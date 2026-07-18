import { NextResponse } from "next/server";
import { hasServiceRoleKey } from "@/lib/env";
import { revalidateInventory } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveUser } from "@/lib/user-session";

export async function POST(request: Request) {
  const user = await getActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is missing on the server." },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const type = String(body.type ?? "");
    const supabase = createAdminClient();

    if (type === "branch") {
      const name = String(body.name ?? "").trim();
      if (!name) {
        return NextResponse.json({ error: "Branch name is required" }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("branches")
        .insert({
          name,
          address: String(body.address ?? "").trim() || null,
          phone: String(body.phone ?? "").trim() || null,
        })
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      revalidateInventory("branches");
      return NextResponse.json({
        ok: true,
        message: "Branch added",
        branch: data,
      });
    }

    if (type === "transfer") {
      const fromBranch = String(body.from_branch ?? "");
      const toBranch = String(body.to_branch ?? "");
      if (!fromBranch || !toBranch || fromBranch === toBranch) {
        return NextResponse.json(
          { error: "Select two different branches" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from("stock_transfers")
        .insert({
          from_branch: fromBranch,
          to_branch: toBranch,
          status: "pending",
        })
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      revalidateInventory("branches");
      return NextResponse.json({
        ok: true,
        message: "Transfer request created",
        transfer: data,
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not save branch data" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const user = await getActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is missing on the server." },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "");
    const status = String(body.status ?? "");
    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing transfer id or status" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("stock_transfers")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    revalidateInventory("branches");
    return NextResponse.json({
      ok: true,
      message: "Transfer updated",
      transfer: data,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not update transfer" },
      { status: 500 }
    );
  }
}
