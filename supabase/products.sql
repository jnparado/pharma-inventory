-- Run this entire file in Supabase SQL Editor (Settings → SQL)

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text
);

INSERT INTO public.categories (name)
SELECT 'General'
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE lower(name) = 'general'
);

-- Product register columns (works with or without batches)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS lot_number text,
  ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit text DEFAULT 'pcs',
  ADD COLUMN IF NOT EXISTS supplier_id uuid,
  ADD COLUMN IF NOT EXISTS supplier_name text,
  ADD COLUMN IF NOT EXISTS rack_location text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS exp_date date,
  ADD COLUMN IF NOT EXISTS cost numeric(12, 2),
  ADD COLUMN IF NOT EXISTS purchase_price numeric(12, 2),
  ADD COLUMN IF NOT EXISTS selling_price numeric(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selling_price_retail numeric(12, 2),
  ADD COLUMN IF NOT EXISTS selling_price_ws numeric(12, 2),
  ADD COLUMN IF NOT EXISTS entry_date date,
  ADD COLUMN IF NOT EXISTS received_date date,
  ADD COLUMN IF NOT EXISTS reorder_level integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS category_id uuid,
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.product_batches
  ADD COLUMN IF NOT EXISTS batch_number text,
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS quantity_received integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_remaining integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchase_price numeric(12, 2),
  ADD COLUMN IF NOT EXISTS received_date date,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_products_lot_number ON public.products (lot_number);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku);
CREATE INDEX IF NOT EXISTS idx_products_brand_name ON public.products (brand_name);
