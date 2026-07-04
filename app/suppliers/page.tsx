import { createSupplier, deleteSupplier } from "@/app/actions";
import { getSuppliers, isSupabaseConfigured } from "@/lib/data";
import {
  Card,
  EmptyState,
  FlashMessage,
  PageHeader,
  SetupNotice,
  buttonClass,
  inputClass,
  labelClass,
} from "@/components/ui";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Suppliers" />
        <SetupNotice />
      </>
    );
  }

  const suppliers = await getSuppliers();

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Distributors and wholesalers you receive stock from."
      />
      <FlashMessage success={success} error={error} />

      <Card title="Add supplier" className="mb-6">
        <form
          action={createSupplier}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div>
            <label className={labelClass} htmlFor="company_name">
              Company name
            </label>
            <input
              id="company_name"
              name="company_name"
              required
              placeholder="MediSupply PH"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="contact_person">
              Contact person
            </label>
            <input
              id="contact_person"
              name="contact_person"
              placeholder="Ana Reyes"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              placeholder="0917-555-1001"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="orders@medisupply.ph"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="address">
              Address
            </label>
            <input
              id="address"
              name="address"
              placeholder="Quezon City"
              className={inputClass}
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className={buttonClass}>
              Add supplier
            </button>
          </div>
        </form>
      </Card>

      <Card title={`Suppliers (${suppliers.length})`}>
        {suppliers.length === 0 ? (
          <EmptyState message="No suppliers yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-medium">Company</th>
                  <th className="pb-2 font-medium">Contact</th>
                  <th className="pb-2 font-medium">Phone</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Address</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 font-medium text-slate-700">
                      {s.company_name}
                    </td>
                    <td className="py-3">{s.contact_person ?? "—"}</td>
                    <td className="py-3">{s.phone ?? "—"}</td>
                    <td className="py-3">{s.email ?? "—"}</td>
                    <td className="py-3 text-slate-500">{s.address ?? "—"}</td>
                    <td className="py-3 text-right">
                      <form action={deleteSupplier}>
                        <input type="hidden" name="id" value={s.id} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
