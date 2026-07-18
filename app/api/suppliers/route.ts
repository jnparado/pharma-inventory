import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/api-admin";
import { hasServiceRoleKey } from "@/lib/env";
import { revalidateInventory } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Supplier } from "@/lib/types";

function parseSupplierBody(body: Record<string, unknown>) {
  return {
    company_name: String(body.company_name ?? "").trim(),
    contact_person: String(body.contact_person ?? "").trim() || null,
    phone: String(body.phone ?? "").trim() || null,
    email: String(body.email ?? "").trim() || null,
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
    const row = parseSupplierBody(body);
    if (!row.company_name) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("suppliers")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    revalidateInventory("suppliers");
    const supplier = data as Supplier;
    return NextResponse.json({
      ok: true,
      message: "Supplier added",
      supplier,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not add supplier" },
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
    const row = parseSupplierBody(body);
    if (!id) {
      return NextResponse.json({ error: "Missing supplier id" }, { status: 400 });
    }
    if (!row.company_name) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("suppliers")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    revalidateInventory("suppliers");
    return NextResponse.json({
      ok: true,
      message: "Supplier updated",
      supplier: data as Supplier,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not update supplier" },
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
      return NextResponse.json({ error: "Missing supplier id" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    revalidateInventory("suppliers");
    return NextResponse.json({ ok: true, message: "Supplier deleted", id });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not delete supplier" },
      { status: 500 }
    );
  }
}
