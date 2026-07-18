import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-admin";
import {
  customerFromInput,
  insertCustomer,
  updateCustomerRow,
  type CustomerInput,
} from "@/lib/customers-db";
import { hasServiceRoleKey } from "@/lib/env";
import { revalidateInventory } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Customer } from "@/lib/types";

function parseCustomerBody(body: Record<string, unknown>): CustomerInput {
  return {
    full_name: String(body.full_name ?? "").trim(),
    email: String(body.email ?? "").trim() || null,
    phone: String(body.phone ?? "").trim() || null,
    address: String(body.address ?? "").trim() || null,
  };
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is missing on the server." },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const input = parseCustomerBody(body);
    if (!input.full_name) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error, id } = await insertCustomer(supabase, input);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    revalidateInventory("customers", "dashboard");

    const customer: Customer = customerFromInput(input, id ?? crypto.randomUUID());
    return NextResponse.json({
      ok: true,
      message: "Customer added",
      customer,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not add customer" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is missing on the server." },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body.id ?? "");
    const input = parseCustomerBody(body);
    if (!id) {
      return NextResponse.json({ error: "Missing customer id" }, { status: 400 });
    }
    if (!input.full_name) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await updateCustomerRow(supabase, id, input);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    revalidateInventory("customers", "dashboard");

    const customer: Customer = customerFromInput(
      input,
      id,
      (body.created_at as string | null | undefined) ?? null
    );
    return NextResponse.json({
      ok: true,
      message: "Customer updated",
      customer,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not update customer" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is missing on the server." },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get("id") ?? "");
    if (!id) {
      return NextResponse.json({ error: "Missing customer id" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    revalidateInventory("customers", "dashboard");
    return NextResponse.json({ ok: true, message: "Customer removed", id });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not delete customer" },
      { status: 500 }
    );
  }
}
