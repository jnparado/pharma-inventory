import { BranchesWorkspace } from "@/components/branches-workspace";
import { PageHeader, SetupNotice } from "@/components/ui";
import {
  getBranchStockSummary,
  getBranches,
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

  const [branches, transfers, branchStock] = await Promise.all([
    getBranches(),
    getStockTransfers(),
    getBranchStockSummary(),
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
        initialSuccess={success}
        initialError={error}
      />
    </>
  );
}
