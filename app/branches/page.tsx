import {
  createBranch,
  createStockTransfer,
  updateTransferStatus,
} from "@/app/actions";
import {
  getBranchStockSummary,
  getBranches,
  getStockTransfers,
  isSupabaseConfigured,
} from "@/lib/data";
import {
  Badge,
  Card,
  EmptyState,
  FlashMessage,
  PageHeader,
  SetupNotice,
  buttonClass,
  inputClass,
  labelClass,
} from "@/components/ui";

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
      <FlashMessage success={success} error={error} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Add branch">
          <form action={createBranch} className="grid gap-3">
            <div>
              <label className={labelClass} htmlFor="name">
                Branch name
              </label>
              <input
                id="name"
                name="name"
                required
                placeholder="Branch A — Makati"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="address">
                Address
              </label>
              <input id="address" name="address" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="phone">
                Phone
              </label>
              <input id="phone" name="phone" className={inputClass} />
            </div>
            <button type="submit" className={buttonClass}>
              Add branch
            </button>
          </form>
        </Card>

        <Card title="Transfer stock between branches">
          {branches.length < 2 ? (
            <EmptyState message="Add at least two branches to enable transfers." />
          ) : (
            <form action={createStockTransfer} className="grid gap-3">
              <div>
                <label className={labelClass}>From branch</label>
                <select name="from_branch" required className={inputClass}>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>To branch</label>
                <select name="to_branch" required className={inputClass}>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className={buttonClass}>
                Request transfer
              </button>
              <p className="text-xs text-slate-400">
                Example: Branch A lacks antibiotics — transfer from Branch B.
              </p>
            </form>
          )}
        </Card>
      </div>

      <Card title={`Branches (${branches.length})`} className="mt-6">
        {branchStock.length === 0 ? (
          <EmptyState message="No branches yet." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {branchStock.map(({ branch, total_skus, items }) => (
              <div
                key={branch.id}
                className="rounded-lg border border-slate-100 bg-slate-50 p-4"
              >
                <h3 className="font-semibold text-slate-800">{branch.name}</h3>
                <p className="text-xs text-slate-500">{branch.address ?? "—"}</p>
                <p className="mt-2 text-sm">
                  <span className="font-medium">{total_skus}</span> SKUs in stock
                </p>
                {items.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {items.map((item) => (
                      <li key={item.sku}>
                        {item.product_name}: {item.quantity}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Stock transfers" className="mt-6">
        {(transfers ?? []).length === 0 ? (
          <EmptyState message="No transfer requests yet." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400">
                <th className="pb-2">From</th>
                <th className="pb-2">To</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(transfers ?? []).map((t) => (
                <tr key={t.id}>
                  <td className="py-2">
                    {(t as { from_branch_info?: { name: string } }).from_branch_info?.name ?? "—"}
                  </td>
                  <td className="py-2">
                    {(t as { to_branch_info?: { name: string } }).to_branch_info?.name ?? "—"}
                  </td>
                  <td className="py-2">
                    <Badge
                      tone={
                        t.status === "completed"
                          ? "success"
                          : t.status === "pending"
                            ? "warning"
                            : "default"
                      }
                    >
                      {t.status ?? "unknown"}
                    </Badge>
                  </td>
                  <td className="py-2">
                    {t.status === "pending" && (
                      <form action={updateTransferStatus} className="inline">
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="status" value="completed" />
                        <button
                          type="submit"
                          className="text-xs font-medium text-teal-600 hover:underline"
                        >
                          Mark completed
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
