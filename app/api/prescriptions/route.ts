import { NextResponse } from "next/server";
import { getPrescriptions } from "@/lib/data";
import { hasServiceRoleKey } from "@/lib/env";
import { revalidateInventory } from "@/lib/revalidate";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSchemaError } from "@/lib/supabase/schema-fallback";
import { getActiveUser } from "@/lib/user-session";

export async function GET() {
  const user = await getActiveUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  try {
    const prescriptions = await getPrescriptions();
    return NextResponse.json({ prescriptions });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not load prescriptions" },
      { status: 500 }
    );
  }
}

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
    const text = String(body.prescription_text ?? "").trim();
    const doctor = String(body.doctor_name ?? "").trim() || null;

    if (!text) {
      return NextResponse.json(
        { error: "Enter prescription text" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Some schemas restrict status via a check constraint and may lack the
    // prescription_text column, so fall back until an insert succeeds.
    const statusCandidates = ["processed", "pending", "verified", null];
    let error: { message: string } | null = null;

    outer: for (const status of statusCandidates) {
      for (const includeText of [true, false]) {
        const row: Record<string, unknown> = {
          doctor_name: doctor,
          status,
          prescription_image_url: null,
        };
        if (includeText) row.prescription_text = text;

        ({ error } = await supabase.from("prescriptions").insert(row));
        if (!error) break outer;

        const message = error.message.toLowerCase();
        if (includeText && isSchemaError(error.message)) continue;
        if (message.includes("status_check")) break;
        break outer;
      }
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    revalidateInventory("prescriptions");
    return NextResponse.json({
      ok: true,
      message: "Prescription saved",
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not save prescription" },
      { status: 500 }
    );
  }
}
