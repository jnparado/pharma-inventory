import { NextResponse } from "next/server";
import { revalidateProductsPage } from "@/lib/revalidate";
import { isAdmin } from "@/lib/permissions";
import {
  insertProductEntry,
  parseProductEntryBody,
  validateProductEntry,
} from "@/lib/products-db";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRoleKey } from "@/lib/env";
import { getActiveUser } from "@/lib/user-session";

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/\s+/g, "_")
  );

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

export async function POST(request: Request) {
  const user = await getActiveUser();
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY is missing. Add it in Vercel env vars, then redeploy.",
      },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
    }

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV is empty or missing a header row" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const input = parseProductEntryBody({
        entry_date: row.entry_date,
        product_name: row.product_name,
        brand: row.brand,
        unit: row.unit,
        supplier_id: row.supplier_id,
        rack_location: row.rack_location ?? row.location,
        quantity: row.quantity,
        lot_number: row.lot_number,
        expiry_date: row.expiry_date ?? row.exp_date,
        cost: row.cost,
        selling_price_ws: row.selling_price_ws ?? row.ws_price,
        selling_price_retail:
          row.selling_price_retail ?? row.retail_price ?? row.price,
      });

      const validationError = validateProductEntry(input);
      if (validationError) {
        errors.push(`Row ${i + 2}: ${validationError}`);
        continue;
      }

      const { error } = await insertProductEntry(supabase, input);
      if (error) {
        errors.push(`Row ${i + 2}: ${error}`);
        continue;
      }

      imported++;
    }

    revalidateProductsPage();

    if (imported === 0) {
      return NextResponse.json(
        {
          error:
            errors[0] ??
            "No rows imported. Check CSV headers and required fields.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      imported,
      message:
        errors.length > 0
          ? `Imported ${imported} products. ${errors.length} row(s) skipped.`
          : `Imported ${imported} products`,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Import failed" },
      { status: 500 }
    );
  }
}
