import type { SupabaseClient } from "@supabase/supabase-js";
import type { Customer } from "@/lib/types";

export type CustomerInput = {
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

const COLUMN_CANDIDATES = [
  "full_name",
  "name",
  "email",
  "phone",
  "address",
  "mailing_address",
  "street_address",
  "customer_address",
  "location",
  "notes",
  "created_at",
] as const;

const ADDRESS_WRITE_COLUMNS = [
  "address",
  "mailing_address",
  "street_address",
  "customer_address",
  "location",
] as const;

let cachedCustomerColumns: Set<string> | null = null;

export function invalidateCustomerColumnCache(): void {
  cachedCustomerColumns = null;
}

function missingColumn(message: string, column: string): boolean {
  const lower = message.toLowerCase();
  const col = column.toLowerCase();
  return (
    lower.includes(col) &&
    (lower.includes("column") ||
      lower.includes("schema cache") ||
      lower.includes("does not exist"))
  );
}

function readAddress(
  row: Record<string, unknown>,
  columns: Set<string>
): string | null {
  for (const key of ADDRESS_WRITE_COLUMNS) {
    if (!columns.has(key)) continue;
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  if (columns.has("notes")) {
    const notes = row.notes;
    if (typeof notes === "string" && notes.trim()) {
      return notes.trim();
    }
  }

  return null;
}

/** Map DB row variants (e.g. name vs full_name) to app Customer type. */
export function normalizeCustomer(
  row: Record<string, unknown>,
  columns?: Set<string>
): Customer {
  const cols =
    columns ??
    new Set(Object.keys(row).filter((k) => row[k] !== undefined));

  return {
    id: String(row.id),
    full_name:
      (row.full_name as string | null | undefined) ??
      (row.name as string | null | undefined) ??
      null,
    email: (row.email as string | null | undefined) ?? null,
    phone: (row.phone as string | null | undefined) ?? null,
    address: readAddress(row, cols),
    created_at: (row.created_at as string | null | undefined) ?? null,
  };
}

async function getCustomerColumns(
  supabase: SupabaseClient
): Promise<Set<string>> {
  if (cachedCustomerColumns) {
    await refreshAddressColumnProbe(supabase, cachedCustomerColumns);
    return cachedCustomerColumns;
  }

  const { data, error } = await supabase.from("customers").select("*").limit(1);
  if (!error && data?.[0]) {
    cachedCustomerColumns = new Set(Object.keys(data[0]));
    await refreshAddressColumnProbe(supabase, cachedCustomerColumns);
    return cachedCustomerColumns;
  }

  const discovered = new Set<string>(["id"]);
  await Promise.all(
    COLUMN_CANDIDATES.map(async (col) => {
      const { error: probeError } = await supabase
        .from("customers")
        .select(col)
        .limit(0);
      if (!probeError) discovered.add(col);
    })
  );
  cachedCustomerColumns = discovered;
  return cachedCustomerColumns;
}

/** Pick up address column after Supabase migration without full cache bust. */
async function refreshAddressColumnProbe(
  supabase: SupabaseClient,
  columns: Set<string>
): Promise<void> {
  if (ADDRESS_WRITE_COLUMNS.some((col) => columns.has(col)) || columns.has("notes")) {
    return;
  }

  for (const col of [...ADDRESS_WRITE_COLUMNS, "notes"] as const) {
    const { error } = await supabase.from("customers").select(col).limit(0);
    if (!error) columns.add(col);
  }
}

export async function customerTableHasAddressColumn(
  supabase: SupabaseClient
): Promise<boolean> {
  const columns = await getCustomerColumns(supabase);
  return (
    ADDRESS_WRITE_COLUMNS.some((col) => columns.has(col)) || columns.has("notes")
  );
}

function buildCustomerPayload(
  input: CustomerInput,
  columns: Set<string>
): Record<string, string | null> {
  const row: Record<string, string | null> = {};
  const name = input.full_name.trim();

  if (columns.has("full_name")) row.full_name = name;
  else if (columns.has("name")) row.name = name;

  if (columns.has("email")) row.email = input.email;
  if (columns.has("phone")) row.phone = input.phone;

  const addr = input.address?.trim() || null;
  if (addr) {
    let stored = false;
    for (const col of ADDRESS_WRITE_COLUMNS) {
      if (columns.has(col)) {
        row[col] = addr;
        stored = true;
        break;
      }
    }
    if (!stored && columns.has("notes")) {
      row.notes = addr;
    }
  }

  return row;
}

function pickKnownColumns(
  payload: Record<string, string | null>,
  columns: Set<string>
): Record<string, string | null> {
  const row: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (columns.has(key)) row[key] = value;
  }
  return row;
}

async function writeCustomerRow(
  supabase: SupabaseClient,
  input: CustomerInput,
  customerId?: string
): Promise<{ id: string | null; error: string | null }> {
  let columns = await getCustomerColumns(supabase);
  let row = pickKnownColumns(buildCustomerPayload(input, columns), columns);

  for (let attempt = 0; attempt < 4; attempt++) {
    if (Object.keys(row).length === 0) {
      return { id: null, error: "Could not save customer — no matching columns" };
    }

    const result = customerId
      ? await supabase
          .from("customers")
          .update(row)
          .eq("id", customerId)
          .select("id")
          .single()
      : await supabase.from("customers").insert(row).select("id").single();

    if (!result.error && result.data) {
      invalidateCustomerColumnCache();
      return { id: customerId ?? String(result.data.id), error: null };
    }

    if (!result.error) {
      return { id: null, error: "Could not save customer" };
    }

    const badKeys = Object.keys(row).filter((key) =>
      missingColumn(result.error!.message, key)
    );
    if (badKeys.length === 0) {
      return { id: null, error: result.error.message };
    }

    for (const key of badKeys) {
      delete row[key];
      columns.delete(key);
    }
    cachedCustomerColumns = columns;

    row = pickKnownColumns(buildCustomerPayload(input, columns), columns);
  }

  return { id: null, error: "Could not save customer" };
}

export async function fetchCustomers(
  supabase: SupabaseClient
): Promise<Customer[]> {
  const columns = await getCustomerColumns(supabase);

  const orderAttempts = [
    columns.has("full_name") ? ("full_name" as const) : null,
    columns.has("name") ? ("name" as const) : null,
    columns.has("created_at") ? ("created_at" as const) : null,
  ].filter((col): col is "full_name" | "name" | "created_at" => col !== null);

  for (const orderCol of orderAttempts) {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order(orderCol, {
        ascending: orderCol === "created_at" ? false : true,
      });

    if (!error) {
      return (data ?? []).map((row) =>
        normalizeCustomer(row as Record<string, unknown>, columns)
      );
    }
    if (!missingColumn(error.message, orderCol)) break;
  }

  const { data, error } = await supabase.from("customers").select("*");
  if (error) throw new Error(`Failed to load customers: ${error.message}`);

  return (data ?? []).map((row) =>
    normalizeCustomer(row as Record<string, unknown>, columns)
  );
}

export async function fetchCustomerById(
  supabase: SupabaseClient,
  id: string
): Promise<Customer | null> {
  const columns = await getCustomerColumns(supabase);
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load customer: ${error.message}`);
  return data
    ? normalizeCustomer(data as Record<string, unknown>, columns)
    : null;
}

export function customerFromInput(
  input: CustomerInput,
  id: string,
  created_at?: string | null
): Customer {
  return {
    id,
    full_name: input.full_name,
    email: input.email,
    phone: input.phone,
    address: input.address,
    created_at: created_at ?? new Date().toISOString(),
  };
}

export async function insertCustomer(
  supabase: SupabaseClient,
  input: CustomerInput
): Promise<{ error: string | null; id: string | null }> {
  const result = await writeCustomerRow(supabase, input);
  return { error: result.error, id: result.id };
}

export async function updateCustomerRow(
  supabase: SupabaseClient,
  id: string,
  input: CustomerInput
): Promise<{ error: string | null }> {
  const result = await writeCustomerRow(supabase, input, id);
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
