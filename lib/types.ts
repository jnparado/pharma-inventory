export type Supplier = {
  id: string;
  company_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string | null;
};

export type Customer = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
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
  selling_price_ws: number | null;
  reorder_level: number | null;
  requires_prescription: boolean | null;
  created_at: string | null;
};

export type ProductInventoryLine = {
  batch_id: string;
  product_id: string;
  entry_date: string | null;
  product_name: string;
  brand: string | null;
  quantity: number;
  lot_number: string;
  expiry_date: string | null;
  cost: number | null;
  selling_price_ws: number | null;
  selling_price_retail: number;
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

export type Branch = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  created_at: string | null;
};

export type StockTransfer = {
  id: string;
  from_branch: string | null;
  to_branch: string | null;
  status: string | null;
  created_at: string | null;
  from_branch_info?: Pick<Branch, "name"> | null;
  to_branch_info?: Pick<Branch, "name"> | null;
};

export type PurchaseOrder = {
  id: string;
  supplier_id: string | null;
  po_number: string;
  status: string | null;
  ordered_by: string | null;
  created_at: string | null;
  suppliers?: Pick<Supplier, "company_name"> | null;
  purchase_order_items?: PurchaseOrderItem[];
};

export type PurchaseOrderItem = {
  id: string;
  purchase_order_id: string | null;
  product_id: string | null;
  quantity: number;
  unit_cost: number | null;
  products?: Pick<Product, "product_name" | "sku" | "unit"> | null;
};

export type Prescription = {
  id: string;
  customer_id: string | null;
  doctor_name: string | null;
  prescription_image_url: string | null;
  uploaded_at: string | null;
  status: string | null;
};

export type DemandForecast = {
  product_id: string;
  product_name: string;
  sku: string;
  category: string | null;
  current_stock: number;
  reorder_level: number;
  avg_daily_sales: number;
  predicted_30_day_demand: number;
  recommended_reorder_qty: number;
  reorder_by: string;
  season_factor: number;
  status: "ok" | "reorder" | "overstock" | "critical";
  reason: string;
};

export type PrescriptionMatch = {
  medicine: string;
  in_stock: boolean;
  available_qty: number;
  product_id: string | null;
  product_name: string | null;
  alternatives: string[];
};

export type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  branch_id: string | null;
  created_at: string | null;
};

export type UserRole =
  | "admin"
  | "manager"
  | "pharmacist"
  | "cashier";

export type Notification = {
  id: string;
  type: string | null;
  title: string;
  message: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

export type Sale = {
  id: string;
  invoice_number: string;
  receipt_number: string | null;
  customer_id: string | null;
  cashier_id: string | null;
  total_amount: number;
  payment_method: string | null;
  created_at: string | null;
};

export type SaleItem = {
  id: string;
  sale_id: string | null;
  product_id: string | null;
  batch_id: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products?: Pick<Product, "product_name" | "sku" | "unit"> | null;
};

export type SaleWithItems = Sale & {
  sale_items: SaleItem[];
};

export type SalesReportSummary = {
  today_total: number;
  today_count: number;
  week_total: number;
  week_count: number;
  month_total: number;
  month_count: number;
  all_time_total: number;
  top_products: { product_name: string; sku: string; qty_sold: number; revenue: number }[];
};
