-- Run in Supabase SQL Editor for the product inventory register

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS selling_price_ws numeric(12, 2);

ALTER TABLE public.product_batches
  ADD COLUMN IF NOT EXISTS received_date date;

CREATE INDEX IF NOT EXISTS idx_product_batches_received_date
  ON public.product_batches (received_date DESC);

CREATE INDEX IF NOT EXISTS idx_products_brand_name
  ON public.products (brand_name);
