-- Run in Supabase SQL Editor so stock transfers can track product and quantity

ALTER TABLE public.stock_transfers
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id),
  ADD COLUMN IF NOT EXISTS quantity integer;
