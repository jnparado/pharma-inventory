import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanupOrphanedPurchaseOrderSales } from "@/lib/purchase-order-invoice";
import type { ProductInventoryLine } from "@/lib/types";
import { toDateInputValue, normalizeProductUom, formatProductUom } from "@/lib/utils";

export type ProductEntryInput = {
  entry_date: string;
  product_name: string;
  brand: string;
  unit: string;
  supplier_id: string | null;
  rack_location: string | null;
  quantity: number;
  lot_number: string;
  expiry_date: string | null;
  cost: number;
  selling_price_ws: number;
  selling_price_retail: number;
};

type BatchRow = {
  id: string;
  product_id: string | null;
  batch_number: string;
  expiry_date: string | null;
  quantity_remaining: number | null;
  purchase_price: number | null;
  received_date?: string | null;
  created_at: string | null;
  products: unknown;
};

const REGISTER_COLUMN_CANDIDATES = [
  "product_name",
  "lot_number",
  "brand",
  "brand_name",
  "unit",
  "supplier",
  "supplier_id",
  "supplier_name",
  "rack_location",
  "location",
  "rack",
  "storage_location",
  "shelf",
  "quantity",
  "expiry_date",
  "exp_date",
  "cost",
  "purchase_price",
  "selling_price_ws",
  "selling_price_retail",
  "selling_price",
  "price",
  "entry_date",
  "received_date",
] as const;

const PRODUCT_COLUMN_PROBE = [
  "supplier",
  "supplier_id",
  "rack_location",
  "location",
  "rack",
  "storage_location",
  "shelf",
] as const;

const RACK_WRITE_COLUMNS = [
  "rack_location",
  "location",
  "rack",
  "storage_location",
  "shelf",
] as const;

const INVENTORY_SELECTS = [
  "id, product_id, batch_number, expiry_date, quantity_remaining, purchase_price, received_date, created_at, products(product_name, brand_name, unit, selling_price, selling_price_ws)",
  "id, product_id, batch_number, expiry_date, quantity_remaining, purchase_price, created_at, products(product_name, brand_name, unit, selling_price, selling_price_ws)",
  "id, product_id, batch_number, expiry_date, quantity_remaining, purchase_price, created_at, products(product_name, brand_name, unit, selling_price)",
  "id, product_id, batch_number, expiry_date, quantity_remaining, purchase_price, created_at, products(product_name, unit, selling_price)",
  "id, product_id, batch_number, expiry_date, quantity_remaining, purchase_price, created_at, products(product_name, brand_name, selling_price, selling_price_ws)",
  "id, product_id, batch_number, expiry_date, quantity_remaining, purchase_price, created_at, products(product_name, brand_name, selling_price)",
  "id, product_id, batch_number, expiry_date, quantity_remaining, purchase_price, created_at, products(product_name, selling_price)",
] as const;

let cachedProductColumns: Set<string> | null = null;
let cachedFlatRegister: boolean | null = null;
let cachedInventorySelect: string | null = null;
let cachedHasRackColumn: boolean | null = null;

export function invalidateProductColumnCache(): void {
  cachedProductColumns = null;
  cachedHasRackColumn = null;
}

export async function productTableHasRackColumn(
  supabase: SupabaseClient
): Promise<boolean> {
  if (cachedHasRackColumn !== null) return cachedHasRackColumn;
  const columns = await getProductColumns(supabase);
  cachedHasRackColumn = RACK_WRITE_COLUMNS.some((col) => columns.has(col));
  return cachedHasRackColumn;
}

async function patchRackLocation(
  supabase: SupabaseClient,
  productId: string,
  rack: string | null
): Promise<void> {
  if (!rack?.trim()) return;

  for (const column of RACK_WRITE_COLUMNS) {
    const { error } = await supabase
      .from("products")
      .update({ [column]: rack.trim() })
      .eq("id", productId);

    if (!error) return;
    if (!missingColumn(error.message, column)) return;
  }
}

async function refreshProductColumnProbe(
  supabase: SupabaseClient,
  columns: Set<string>
): Promise<void> {
  for (const col of PRODUCT_COLUMN_PROBE) {
    if (columns.has(col)) continue;
    const { error } = await supabase.from("products").select(col).limit(0);
    if (!error) columns.add(col);
  }
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

function readRackLocation(row: Record<string, unknown>): string | null {
  for (const key of RACK_WRITE_COLUMNS) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function buildRegisterPayload(
  input: ProductEntryInput
): Record<string, string | number | null> {
  const brand = input.brand.trim() || null;
  const unit = normalizeProductUom(input.unit) ?? "pcs";
  const rack = input.rack_location?.trim() || null;
  const supplier = input.supplier_id?.trim() || null;
  return {
    product_name: input.product_name.trim(),
    // Optional, but the column is NOT NULL in some schemas — store "".
    lot_number: input.lot_number.trim(),
    brand,
    brand_name: brand,
    unit,
    supplier,
    supplier_id: supplier,
    rack_location: rack,
    location: rack,
    rack: rack,
    quantity: input.quantity,
    expiry_date: input.expiry_date,
    exp_date: input.expiry_date,
    cost: input.cost,
    purchase_price: input.cost,
    selling_price_ws: input.selling_price_ws,
    selling_price_retail: input.selling_price_retail,
    selling_price: input.selling_price_retail,
    price: input.selling_price_retail,
    entry_date: input.entry_date,
    received_date: input.entry_date,
  };
}

function readSupplierId(row: Record<string, unknown>): string | null {
  const idCol = row.supplier_id;
  if (typeof idCol === "string" && idCol.trim()) return idCol.trim();
  const supplier = row.supplier;
  if (typeof supplier === "string" && supplier.trim()) return supplier.trim();
  return null;
}

function readSupplierName(row: Record<string, unknown>): string | null {
  const supplierEmbed = row.supplier;
  if (
    supplierEmbed &&
    typeof supplierEmbed === "object" &&
    !Array.isArray(supplierEmbed)
  ) {
    const name = (supplierEmbed as { company_name?: string }).company_name;
    if (name?.trim()) return name.trim();
  }

  const joined = row.suppliers as { company_name?: string } | null | undefined;
  const direct = row.supplier_name as string | null | undefined;
  return direct?.trim() || joined?.company_name?.trim() || null;
}

function mapProductRow(r: Record<string, unknown>): ProductInventoryLine {
  const cost = r.cost ?? r.purchase_price;
  const retail = r.selling_price_retail ?? r.selling_price ?? r.price;
  const ws = r.selling_price_ws;

  return {
    batch_id: String(r.id),
    product_id: String(r.id),
    entry_date:
      toDateInputValue(
        (r.entry_date as string | null) ??
          (r.received_date as string | null) ??
          (r.created_at as string | null)?.toString().slice(0, 10) ??
          null
      ) || null,
    product_name: String(r.product_name ?? r.name ?? "Unknown"),
    brand: (r.brand as string | null) ?? (r.brand_name as string | null) ?? null,
    unit: normalizeProductUom(r.unit) ?? "pcs",
    supplier_id: readSupplierId(r),
    supplier_name: readSupplierName(r),
    rack_location: readRackLocation(r),
    quantity: Number(r.quantity ?? r.qty ?? 0),
    lot_number: String(
      (r.lot_number as string | null) || (r.batch_number as string | null) || "—"
    ),
    expiry_date:
      toDateInputValue(
        (r.expiry_date as string | null) ?? (r.exp_date as string | null)
      ) || null,
    cost: cost != null && cost !== "" ? Number(cost) : null,
    selling_price_ws: ws != null && ws !== "" ? Number(ws) : null,
    selling_price_retail: Number(retail ?? 0),
  };
}

async function getProductColumns(
  supabase: SupabaseClient
): Promise<Set<string>> {
  if (cachedProductColumns) return cachedProductColumns;

  const { data, error } = await supabase.from("products").select("*").limit(1);
  if (!error && data?.[0]) {
    cachedProductColumns = new Set(Object.keys(data[0]));
    return cachedProductColumns;
  }

  const discovered = new Set<string>(["product_name", "lot_number"]);
  await Promise.all(
    REGISTER_COLUMN_CANDIDATES.map(async (col) => {
      const { error: probeError } = await supabase
        .from("products")
        .select(col)
        .limit(0);
      if (!probeError) discovered.add(col);
    })
  );
  cachedProductColumns = discovered;
  return cachedProductColumns;
}

export async function isFlatRegister(supabase: SupabaseClient): Promise<boolean> {
  if (cachedFlatRegister !== null) return cachedFlatRegister;

  const [lotProbe, qtyProbe] = await Promise.all([
    supabase.from("products").select("lot_number").limit(0),
    supabase.from("products").select("quantity").limit(0),
  ]);
  cachedFlatRegister = !lotProbe.error && !qtyProbe.error;
  return cachedFlatRegister;
}

function pickKnownColumns(
  payload: Record<string, string | number | null>,
  columns: Set<string>
): Record<string, string | number | null> {
  const row: Record<string, string | number | null> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (columns.has(key)) row[key] = value;
  }
  return row;
}

/** Single round-trip write; strips unknown columns from cache on schema errors. */
async function writeProductsRow(
  supabase: SupabaseClient,
  payload: Record<string, string | number | null>,
  productId?: string
): Promise<{ id: string | null; error: string | null }> {
  let columns = await getProductColumns(supabase);
  let row = pickKnownColumns(payload, columns);

  for (let attempt = 0; attempt < 3; attempt++) {
    if (Object.keys(row).length === 0) {
      return { id: null, error: "Could not save product" };
    }

    const result = productId
      ? await supabase
          .from("products")
          .update(row)
          .eq("id", productId)
          .select("id")
          .single()
      : await supabase.from("products").insert(row).select("id").single();

    if (!result.error && result.data) {
      const savedId = productId ?? String(result.data.id);
      const rack =
        typeof payload.rack_location === "string"
          ? payload.rack_location
          : typeof payload.location === "string"
            ? payload.location
            : typeof payload.rack === "string"
              ? payload.rack
              : null;
      const wroteRack =
        !!rack?.trim() &&
        RACK_WRITE_COLUMNS.some((col) => {
          const value = row[col];
          return typeof value === "string" && value.trim() === rack.trim();
        });
      if (rack?.trim() && !wroteRack) {
        await patchRackLocation(supabase, savedId, rack);
      }
      return { id: savedId, error: null };
    }

    if (!result.error) {
      return { id: productId ?? null, error: "Could not save product" };
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
    cachedProductColumns = columns;
  }

  return { id: null, error: "Could not save product" };
}

function parseProductJoin(value: unknown) {
  const product = value as {
    product_name?: string;
    brand_name?: string | null;
    unit?: string | null;
    selling_price?: number;
    selling_price_ws?: number | null;
  } | null;

  return {
    product_name: product?.product_name ?? "Unknown",
    brand: product?.brand_name ?? null,
    unit: normalizeProductUom(product?.unit) ?? "pcs",
    selling_price_ws: product?.selling_price_ws ?? null,
    selling_price_retail: Number(product?.selling_price ?? 0),
  };
}

export function mapBatchRowToInventoryLine(row: BatchRow): ProductInventoryLine {
  const product = parseProductJoin(row.products);

  return {
    batch_id: row.id,
    product_id: row.product_id ?? "",
    entry_date: toDateInputValue(row.received_date ?? row.created_at?.slice(0, 10)) || null,
    product_name: product.product_name,
    brand: product.brand,
    unit: product.unit,
    supplier_id: null,
    supplier_name: null,
    rack_location: null,
    quantity: row.quantity_remaining ?? 0,
    lot_number: row.batch_number,
    expiry_date: toDateInputValue(row.expiry_date) || null,
    cost: row.purchase_price,
    selling_price_ws: product.selling_price_ws,
    selling_price_retail: product.selling_price_retail,
  };
}

export async function fetchProductInventoryRows(
  supabase: SupabaseClient,
  batchId?: string
): Promise<ProductInventoryLine[]> {
  if (await isFlatRegister(supabase)) {
    return fetchFromProductsOnly(supabase, batchId);
  }

  const fromProducts = await fetchFromProductsOnly(supabase, batchId);
  if (fromProducts.length > 0 || batchId) {
    return fromProducts;
  }

  try {
    const batchRows = await fetchFromBatches(supabase);
    if (batchRows.length > 0) return batchRows;
  } catch {
    // use empty products result
  }

  return fromProducts;
}

async function fetchFromBatches(
  supabase: SupabaseClient,
  batchId?: string
): Promise<ProductInventoryLine[]> {
  let lastError = "Could not load product inventory";

  for (const select of INVENTORY_SELECTS) {
    let query = supabase
      .from("product_batches")
      .select(select)
      .order("created_at", { ascending: false });

    if (batchId) {
      query = query.eq("id", batchId);
    }

    const { data, error } = await query;
    if (!error) {
      return ((data ?? []) as unknown as BatchRow[]).map(mapBatchRowToInventoryLine);
    }

    lastError = error.message;
  }

  throw new Error(`Failed to load product inventory: ${lastError}`);
}

async function fetchFromProductsOnly(
  supabase: SupabaseClient,
  productId?: string
): Promise<ProductInventoryLine[]> {
  const defaultSelects = [
    "*, supplier:suppliers(company_name)",
    "*, suppliers(company_name)",
    "*",
  ] as const;

  const selects = cachedInventorySelect
    ? ([cachedInventorySelect, ...defaultSelects.filter((s) => s !== cachedInventorySelect)] as const)
    : defaultSelects;

  for (const select of selects) {
    let query = supabase.from("products").select(select);
    if (productId) query = query.eq("id", productId);

    for (const orderCol of ["created_at", "id"] as const) {
      const { data, error } = await query.order(orderCol, { ascending: false });
      if (!error) {
        if (!cachedInventorySelect) cachedInventorySelect = select;
        return (data ?? []).map((row) =>
          mapProductRow(row as unknown as Record<string, unknown>)
        );
      }
      if (!missingColumn(error.message, orderCol)) break;
    }

    if (select === cachedInventorySelect) cachedInventorySelect = null;
  }

  return [];
}

export function productLineFromInput(
  input: ProductEntryInput,
  ids: { productId: string; batchId: string },
  extras?: { supplier_name?: string | null }
): ProductInventoryLine {
  return {
    batch_id: ids.batchId,
    product_id: ids.productId,
    entry_date: input.entry_date,
    product_name: input.product_name,
    brand: input.brand || null,
    unit: input.unit,
    supplier_id: input.supplier_id,
    supplier_name: extras?.supplier_name ?? null,
    rack_location: input.rack_location,
    quantity: input.quantity,
    lot_number: input.lot_number.trim() || "—",
    expiry_date: input.expiry_date,
    cost: input.cost,
    selling_price_ws: input.selling_price_ws,
    selling_price_retail: input.selling_price_retail,
  };
}

async function insertProductRow(
  supabase: SupabaseClient,
  input: ProductEntryInput
): Promise<{ productId: string | null; error: string | null }> {
  const created = await writeProductsRow(supabase, buildRegisterPayload(input));
  return { productId: created.id, error: created.error };
}

function buildBatchInsertRows(
  productId: string,
  input: ProductEntryInput
): Record<string, string | number | null>[] {
  // batch_number is often NOT NULL in the batches schema, so generate one
  // when the (optional) lot number is left blank.
  const lot =
    input.lot_number.trim() ||
    `ENTRY-${Date.now().toString(36).toUpperCase()}`;
  const qty = input.quantity;

  return [
    {
      product_id: productId,
      batch_number: lot,
      quantity_remaining: qty,
    },
    {
      product_id: productId,
      batch_number: lot,
      quantity_received: qty,
      quantity_remaining: qty,
      purchase_price: input.cost,
      expiry_date: input.expiry_date,
    },
  ];
}

function buildBatchUpdateRows(
  input: ProductEntryInput
): Record<string, string | number | null>[] {
  const row: Record<string, string | number | null> = {
    expiry_date: input.expiry_date,
    quantity_received: input.quantity,
    quantity_remaining: input.quantity,
    purchase_price: input.cost,
  };
  // Keep the existing batch number when the optional lot field is blank.
  const lot = input.lot_number.trim();
  if (lot) row.batch_number = lot;
  return [row];
}

export async function insertProductEntry(
  supabase: SupabaseClient,
  input: ProductEntryInput
): Promise<{ error: string | null; productId?: string; batchId?: string }> {
  const { productId, error: productError } = await insertProductRow(
    supabase,
    input
  );
  if (!productId) return { error: productError ?? "Could not save product" };

  if (await isFlatRegister(supabase)) {
    return { error: null, productId, batchId: productId };
  }

  let batchId: string | null = null;
  let lastBatchError = "Could not save batch";

  for (const row of buildBatchInsertRows(productId, input)) {
    const { data, error } = await supabase
      .from("product_batches")
      .insert(row)
      .select("id")
      .single();

    if (!error && data) {
      batchId = data.id;
      break;
    }

    lastBatchError = error?.message ?? lastBatchError;
    const isSchemaError =
      error &&
      Object.keys(row).some((key) => missingColumn(error.message, key));
    if (!isSchemaError) break;
  }

  if (!batchId) {
    return { error: null, productId };
  }

  void supabase.from("inventory_transactions").insert({
    product_id: productId,
    batch_id: batchId,
    transaction_type: "stock_in",
    quantity: input.quantity,
    reference_no: input.lot_number.trim()
      ? `Entry ${input.lot_number.trim()}`
      : "Product entry",
  });

  return { error: null, productId, batchId };
}

export async function updateProductEntry(
  supabase: SupabaseClient,
  batchId: string,
  productId: string,
  input: ProductEntryInput
): Promise<{ error: string | null }> {
  const updated = await writeProductsRow(
    supabase,
    buildRegisterPayload(input),
    productId
  );
  if (updated.error) {
    return { error: updated.error };
  }

  if (await isFlatRegister(supabase)) {
    return { error: null };
  }

  for (const row of buildBatchUpdateRows(input)) {
    const { error } = await supabase
      .from("product_batches")
      .update(row)
      .eq("id", batchId);
    if (!error) return { error: null };
    const isSchemaError = Object.keys(row).some((key) =>
      missingColumn(error.message, key)
    );
    if (!isSchemaError) break;
  }

  return { error: null };
}

export async function deleteProductEntry(
  supabase: SupabaseClient,
  productId: string,
  batchId: string
): Promise<{ error: string | null }> {
  if (await isFlatRegister(supabase)) {
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) return { error: error.message };
    await cleanupOrphanedPurchaseOrderSales(supabase).catch(() => {});
    return { error: null };
  }

  const { error: batchError } = await supabase
    .from("product_batches")
    .delete()
    .eq("id", batchId);
  if (batchError) {
    return { error: batchError.message };
  }

  const { count } = await supabase
    .from("product_batches")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  if ((count ?? 0) === 0) {
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) return { error: error.message };
  }

  await cleanupOrphanedPurchaseOrderSales(supabase).catch(() => {});

  return { error: null };
}

export function parseProductEntryBody(body: Record<string, unknown>) {
  const quantity = Number(body.quantity);
  const supplierId =
    String(body.supplier_id ?? body.supplier ?? "").trim() || null;
  const rack =
    String(body.rack_location ?? body.rack ?? body.location ?? "").trim() ||
    null;
  const expiryRaw = String(body.expiry_date ?? "").trim();
  return {
    entry_date:
      String(body.entry_date ?? "").trim() ||
      new Date().toISOString().slice(0, 10),
    product_name: String(body.product_name ?? "").trim(),
    brand: String(body.brand ?? "").trim(),
    unit: normalizeProductUom(body.unit) ?? "pcs",
    supplier_id: supplierId || null,
    rack_location: rack || null,
    quantity,
    lot_number: String(body.lot_number ?? "").trim(),
    expiry_date: expiryRaw || null,
    cost: Number(body.cost ?? 0),
    selling_price_ws: Number(body.selling_price_ws ?? 0),
    selling_price_retail: Number(body.selling_price_retail ?? 0),
  } satisfies ProductEntryInput;
}

export function validateProductEntry(input: ProductEntryInput): string | null {
  if (!input.product_name) {
    return "Product name is required";
  }
  if (!input.brand) {
    return "Brand is required";
  }
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    return "Enter a valid whole-number quantity";
  }
  if (!normalizeProductUom(input.unit)) {
    return "Select a valid unit of measure";
  }
  return null;
}
