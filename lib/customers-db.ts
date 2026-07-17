import type { SupabaseClient } from "@supabase/supabase-js";
import type { Customer } from "@/lib/types";

export type CustomerInput = {
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

function missingColumn(message: string, column: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes(column.toLowerCase()) &&
    (lower.includes("column") || lower.includes("schema cache"))
  );
}

function readAddress(row: Record<string, unknown>): string | null {
  const candidates = [
    row.address,
    row.mailing_address,
    row.street_address,
    row.customer_address,
    row.location,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

/** Map DB row variants (e.g. name vs full_name) to app Customer type. */
export function normalizeCustomer(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    full_name:
      (row.full_name as string | null | undefined) ??
      (row.name as string | null | undefined) ??
      null,
    email: (row.email as string | null | undefined) ?? null,
    phone: (row.phone as string | null | undefined) ?? null,
    address: readAddress(row),
    created_at: (row.created_at as string | null | undefined) ?? null,
  };
}

type RowShape = "full" | "no_address" | "name_full" | "name_only";

let cachedInsertShape: RowShape | null = null;
let cachedUpdateShape: RowShape | null = null;

function rowForShape(shape: RowShape, input: CustomerInput) {
  const { full_name, email, phone, address } = input;
  switch (shape) {
    case "full":
      return { full_name, email, phone, address };
    case "no_address":
      return { full_name, email, phone };
    case "name_full":
      return { name: full_name, email, phone, address };
    case "name_only":
      return { name: full_name, phone };
  }
}

const SHAPES: RowShape[] = ["full", "name_full", "no_address", "name_only"];

const ADDRESS_COLUMNS = [
  "address",
  "mailing_address",
  "street_address",
  "customer_address",
] as const;

async function patchAddress(
  supabase: SupabaseClient,
  id: string,
  address: string | null
): Promise<void> {
  if (!address?.trim()) return;

  for (const column of ADDRESS_COLUMNS) {
    const { error } = await supabase
      .from("customers")
      .update({ [column]: address.trim() })
      .eq("id", id);

    if (!error) return;
    if (!missingColumn(error.message, column)) return;
  }
}

async function tryWrite(
  supabase: SupabaseClient,
  mode: "insert" | "update",
  input: CustomerInput,
  id?: string
): Promise<{ error: string | null; id?: string; shape?: RowShape }> {
  const cached = mode === "insert" ? cachedInsertShape : cachedUpdateShape;
  const order = cached
    ? [cached, ...SHAPES.filter((shape) => shape !== cached)]
    : SHAPES;

  let lastError = mode === "insert" ? "Could not save customer" : "Could not update customer";

  for (const shape of order) {
    const row = rowForShape(shape, input);
    const payload = row as unknown as Record<string, string | null>;
    const result =
      mode === "insert"
        ? await supabase.from("customers").insert(payload).select("id").single()
        : await supabase
            .from("customers")
            .update(payload)
            .eq("id", id!)
            .select("id")
            .single();

    if (!result.error && result.data) {
      if (mode === "insert") cachedInsertShape = shape;
      else cachedUpdateShape = shape;

      const customerId = String(result.data.id);
      await patchAddress(supabase, customerId, input.address);

      return { error: null, id: customerId, shape };
    }

    lastError = result.error?.message ?? lastError;
    const isSchemaError = Object.keys(row).some((key) =>
      missingColumn(result.error?.message ?? "", key)
    );
    if (!isSchemaError) return { error: result.error?.message ?? lastError };
  }

  return { error: lastError };
}

export async function insertCustomer(
  supabase: SupabaseClient,
  input: CustomerInput
): Promise<{ error: string | null }> {
  const result = await tryWrite(supabase, "insert", input);
  return { error: result.error };
}

export async function updateCustomerRow(
  supabase: SupabaseClient,
  id: string,
  input: CustomerInput
): Promise<{ error: string | null }> {
  const result = await tryWrite(supabase, "update", input, id);
  return { error: result.error };
}

export const CUSTOMERS_TABLE_SQL = `-- Run in Supabase SQL Editor (Settings → SQL)
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- If your table uses "name" instead of full_name, copy data once:
-- UPDATE public.customers SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;
`;
