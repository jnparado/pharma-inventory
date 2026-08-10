import { StockWorkspace } from "@/components/stock-workspace";
import { PageHeader, SetupNotice } from "@/components/ui";
import {
  getProducts,
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
    getProducts(),
    getSuppliers(),
    getTransactions(),
  ]);

  return (
    <>
      <PageHeader
        title="Purchase / Sales"
        description="Receive new batches and dispense stock. Dispensing follows FIFO — the oldest received batch is deducted first."
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
