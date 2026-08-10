import { StockWorkspace } from "@/components/stock-workspace";
import { PageHeader, SetupNotice } from "@/components/ui";
import {
  getProductsWithStock,
  getSuppliers,
  getTransactions,
  isSupabaseConfigured,
} from "@/lib/data";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Purchase / Sales" />
        <SetupNotice />
      </>
    );
  }

  const [products, suppliers, transactions] = await Promise.all([
    getProductsWithStock(),
    getSuppliers(),
    getTransactions(),
  ]);

  return (
    <>
      <PageHeader
        title="Purchase / Sales"
        description="Record purchases to add stock and sales to deduct it. Oldest stock is always sold first."
      />
      <StockWorkspace
        initialProducts={products}
        initialSuppliers={suppliers}
        initialTransactions={transactions}
        initialSuccess={success}
        initialError={error}
      />
    </>
  );
}
