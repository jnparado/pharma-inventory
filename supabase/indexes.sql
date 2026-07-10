-- Run in Supabase SQL Editor for faster inserts/selects/updates

CREATE INDEX IF NOT EXISTS idx_product_batches_product_expiry
  ON public.product_batches (product_id, expiry_date)
  WHERE quantity_remaining > 0;

CREATE INDEX IF NOT EXISTS idx_product_batches_expiry
  ON public.product_batches (expiry_date)
  WHERE quantity_remaining > 0;

CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku);

CREATE INDEX IF NOT EXISTS idx_products_barcode
  ON public.products (barcode)
  WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_created_at
  ON public.sales (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_invoice_number
  ON public.sales (invoice_number);

CREATE INDEX IF NOT EXISTS idx_inventory_tx_created_at
  ON public.inventory_transactions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_tx_branch_product
  ON public.inventory_transactions (branch_id, product_id);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (lower(email));

CREATE INDEX IF NOT EXISTS idx_customers_full_name
  ON public.customers (full_name);

CREATE INDEX IF NOT EXISTS idx_sale_items_product_id
  ON public.sale_items (product_id);
