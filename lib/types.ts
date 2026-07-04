export type Supplier = {
  id: string;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string | null;
};

export type Category = {
  id: string;
  name: string;
  description: string | null;
};

export type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  product_name: string;
  generic_name: string | null;
  brand_name: string | null;
  category_id: string | null;
  dosage: string | null;
  form: string | null;
  unit: string | null;
  selling_price: number;
  reorder_level: number | null;
  requires_prescription: boolean | null;
  created_at: string | null;
};

export type ProductBatch = {
  id: string;
  product_id: string | null;
  supplier_id: string | null;
  batch_number: string;
  manufacture_date: string | null;
  expiry_date: string | null;
  purchase_price: number | null;
  quantity_received: number | null;
  quantity_remaining: number | null;
  created_at: string | null;
};

export type InventoryTransaction = {
  id: string;
  product_id: string | null;
  batch_id: string | null;
  branch_id: string | null;
  transaction_type: string;
  quantity: number;
  reference_no: string | null;
  created_by: string | null;
  created_at: string | null;
};

export type ProductWithStock = Product & {
  categories: Pick<Category, "name"> | null;
  total_stock: number;
  nearest_expiry: string | null;
};

export type BatchWithProduct = ProductBatch & {
  products: Pick<Product, "product_name" | "sku" | "unit" | "selling_price"> | null;
  suppliers: Pick<Supplier, "company_name"> | null;
};

export type TransactionWithProduct = InventoryTransaction & {
  products: Pick<Product, "product_name" | "sku" | "unit"> | null;
  product_batches: Pick<ProductBatch, "batch_number"> | null;
};
