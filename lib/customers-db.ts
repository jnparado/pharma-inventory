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
    address: (row.address as string | null | undefined) ?? null,
    created_at: (row.created_at as string | null | undefined) ?? null,
  };
}

function insertVariants(input: CustomerInput): Record<string, string | null>[] {
  const { full_name, email, phone, address } = input;
  return [
    { full_name, email, phone, address },
    { full_name, email, phone },
    { name: full_name, email, phone, address },
    { name: full_name, email, phone },
    { full_name, phone },
    { name: full_name, phone },
  ];
}

function updateVariants(input: CustomerInput): Record<string, string | null>[] {
  return insertVariants(input);
}

export async function insertCustomer(
  supabase: SupabaseClient,
  input: CustomerInput
): Promise<{ error: string | null }> {
  let lastError = "Could not save customer";

  for (const row of insertVariants(input)) {
    const { error } = await supabase.from("customers").insert(row);
    if (!error) return { error: null };
    lastError = error.message;

    const isSchemaError = Object.keys(row).some((key) =>
      missingColumn(error.message, key)
    );
    if (!isSchemaError) return { error: error.message };
  }

  return { error: lastError };
}

export async function updateCustomerRow(
  supabase: SupabaseClient,
  id: string,
  input: CustomerInput
): Promise<{ error: string | null }> {
  let lastError = "Could not update customer";

  for (const row of updateVariants(input)) {
    const { error } = await supabase.from("customers").update(row).eq("id", id);
    if (!error) return { error: null };
    lastError = error.message;

    const isSchemaError = Object.keys(row).some((key) =>
      missingColumn(error.message, key)
    );
    if (!isSchemaError) return { error: error.message };
  }

  return { error: lastError };
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
