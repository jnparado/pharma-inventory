import { NextResponse } from "next/server";
import { parsePrescriptionText } from "@/lib/ai";
import {
  getProductsWithStock,
  isSupabaseConfigured,
} from "@/lib/data";
import { matchPrescriptionMedicines } from "@/lib/inventory-context";

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 }
    );
  }

  const { text } = (await req.json()) as { text: string };
  if (!text?.trim()) {
    return NextResponse.json({ error: "Prescription text required" }, { status: 400 });
  }

  try {
    const medicines = await parsePrescriptionText(text);
    const products = await getProductsWithStock();
    const matches = await matchPrescriptionMedicines(medicines, products);
    return NextResponse.json({ medicines, matches });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
