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
    const text = String(body.prescription_text ?? "").trim();
    const doctor = String(body.doctor_name ?? "").trim() || null;

    if (!text) {
      return NextResponse.json(
        { error: "Enter prescription text" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("prescriptions").insert({
      doctor_name: doctor,
      status: "processed",
      prescription_image_url: null,
    });

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
