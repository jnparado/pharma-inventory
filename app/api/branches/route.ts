import { NextResponse } from "next/server";
import { hasServiceRoleKey } from "@/lib/env";
import { revalidateInventory } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSchemaError } from "@/lib/supabase/schema-fallback";
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
      const productId = String(body.product_id ?? "").trim();
      const quantity = Number(body.quantity);

      if (!fromBranch || !toBranch || fromBranch === toBranch) {
        return NextResponse.json(
          { error: "Select two different branches" },
          { status: 400 }
        );
      }
      if (!productId) {
        return NextResponse.json(
          { error: "Select a product to transfer" },
          { status: 400 }
        );
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return NextResponse.json(
          { error: "Enter a valid whole-number quantity" },
          { status: 400 }
        );
      }

      let result = await supabase
        .from("stock_transfers")
        .insert({
          from_branch: fromBranch,
          to_branch: toBranch,
          product_id: productId,
          quantity,
          status: "pending",
        })
        .select("*")
        .single();

      if (result.error && isSchemaError(result.error.message)) {
        return NextResponse.json(
          {
            error:
              "The stock_transfers table is missing product columns. Run supabase/branches.sql in the Supabase SQL Editor, then retry.",
          },
          { status: 400 }
        );
      }

      if (result.error) {
        return NextResponse.json({ error: result.error.message }, { status: 400 });
      }

      revalidateInventory("branches");
      return NextResponse.json({
        ok: true,
        message: "Transfer request created",
        transfer: result.data,
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
    const { data: existing, error: fetchError } = await supabase
      .from("stock_transfers")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("stock_transfers")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Completing a transfer moves branch-level stock via inventory
    // transactions (out of the source branch, into the destination).
    const productId = (existing as { product_id?: string | null }).product_id;
    const quantity = Number(
      (existing as { quantity?: number | null }).quantity ?? 0
    );
    if (
      status === "completed" &&
      existing.status !== "completed" &&
      productId &&
      quantity > 0
    ) {
      const referenceNo = `transfer-${id.slice(0, 8)}`;
      const { error: txError } = await supabase
        .from("inventory_transactions")
        .insert([
          {
            product_id: productId,
            branch_id: existing.from_branch,
            transaction_type: "transfer_out",
            quantity,
            reference_no: referenceNo,
          },
          {
            product_id: productId,
            branch_id: existing.to_branch,
            transaction_type: "transfer_in",
            quantity,
            reference_no: referenceNo,
          },
        ]);

      if (txError) {
        // Roll the status back so the transfer can be retried.
        await supabase
          .from("stock_transfers")
          .update({ status: existing.status })
          .eq("id", id);
        return NextResponse.json(
          { error: `Could not move stock: ${txError.message}` },
          { status: 400 }
        );
      }
    }

    revalidateInventory("branches");
    return NextResponse.json({
      ok: true,
      message:
        status === "completed"
          ? "Transfer completed — branch stock updated"
          : "Transfer updated",
      transfer: data,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not update transfer" },
      { status: 500 }
    );
  }
}
