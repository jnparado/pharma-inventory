import { BranchesWorkspace } from "@/components/branches-workspace";
import { PageHeader, SetupNotice } from "@/components/ui";
import {
  getBranchStockSummary,
  getBranches,
  getProductsWithStock,
  getStockTransfers,
  isSupabaseConfigured,
} from "@/lib/data";

export default async function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Multi-Branch Inventory" />
        <SetupNotice />
      </>
    );
  }

  const [branches, transfers, branchStock, products] = await Promise.all([
    getBranches(),
    getStockTransfers(),
    getBranchStockSummary(),
    getProductsWithStock(),
  ]);

  return (
    <>
      <PageHeader
        title="Multi-Branch Inventory"
        description="Central dashboard for branch-level stock, transfers between locations, and branch performance."
      />
      <BranchesWorkspace
        initialBranches={branches}
        initialTransfers={transfers ?? []}
        initialBranchStock={branchStock}
        products={products.map((p) => ({
          id: p.id,
          product_name: p.product_name,
          sku: p.sku,
          total_stock: p.total_stock,
        }))}
        initialSuccess={success}
        initialError={error}
      />
    </>
  );
}
