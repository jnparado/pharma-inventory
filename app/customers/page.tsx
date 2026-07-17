import Link from "next/link";
import {
  createCustomer,
  deleteCustomer,
  updateCustomer,
} from "@/app/actions";
import {
  getCustomerById,
  getCustomers,
  isSupabaseConfigured,
} from "@/lib/data";
import { canManageRecords } from "@/lib/permissions";
import { getActiveUser } from "@/lib/user-session";
import { formatDateTime } from "@/lib/utils";
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

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; edit?: string }>;
}) {
  const { success, error, edit } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="Customers" />
        <SetupNotice />
      </>
    );
  }

  const [customers, activeUser, editing] = await Promise.all([
    getCustomers(),
    getActiveUser(),
    edit ? getCustomerById(edit) : Promise.resolve(null),
  ]);

  const isAdmin = canManageRecords(activeUser);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Manage customer records for sales and follow-up."
      />
      <FlashMessage success={success} error={error} />

      {!isAdmin && (
        <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          View-only mode. Contact an admin to add or edit customer records.
        </p>
      )}

      {isAdmin && editing && (
        <Card title="Edit customer" className="mb-6">
          <form
            action={updateCustomer}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <input type="hidden" name="id" value={editing.id} />
            <div>
              <label className={labelClass} htmlFor="edit_full_name">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit_full_name"
                name="full_name"
                required
                defaultValue={editing.full_name ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="edit_email">
                Email
              </label>
              <input
                id="edit_email"
                name="email"
                type="email"
                defaultValue={editing.email ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="edit_phone">
                Phone
              </label>
              <input
                id="edit_phone"
                name="phone"
                defaultValue={editing.phone ?? ""}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelClass} htmlFor="edit_address">
                Address
              </label>
              <input
                id="edit_address"
                name="address"
                defaultValue={editing.address ?? ""}
                className={inputClass}
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
              <button type="submit" className={buttonClass}>
                Save changes
              </button>
              <Link
                href="/customers"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </Card>
      )}

      {isAdmin && !editing && (
        <Card title="Add customer" className="mb-6">
          <form
            action={createCustomer}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div>
              <label className={labelClass} htmlFor="full_name">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                id="full_name"
                name="full_name"
                required
                placeholder="Maria Santos"
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
                placeholder="maria@email.com"
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
                placeholder="0917-555-0100"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelClass} htmlFor="address">
                Address
              </label>
              <input
                id="address"
                name="address"
                placeholder="Manila"
                className={inputClass}
              />
            </div>
            <div>
              <button type="submit" className={buttonClass}>
                Add customer
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card title={`Customers (${customers.length})`}>
        {customers.length === 0 ? (
          <EmptyState message="No customers yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Phone</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Address</th>
                  <th className="pb-2 font-medium">Registered</th>
                  {isAdmin && <th className="pb-2 font-medium" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 font-medium text-slate-700">
                      {c.full_name ?? "—"}
                    </td>
                    <td className="py-3">{c.phone ?? "—"}</td>
                    <td className="py-3">{c.email ?? "—"}</td>
                    <td className="py-3 max-w-xs whitespace-pre-wrap text-slate-500">
                      {c.address ?? "—"}
                    </td>
                    <td className="py-3 text-slate-500">
                      {c.created_at ? formatDateTime(c.created_at) : "—"}
                    </td>
                    {isAdmin && (
                      <td className="py-3 text-right whitespace-nowrap">
                        <Link
                          href={`/customers?edit=${c.id}`}
                          className="mr-3 text-xs font-medium text-teal-600 hover:underline"
                        >
                          Edit
                        </Link>
                        <form action={deleteCustomer} className="inline">
                          <input type="hidden" name="id" value={c.id} />
                          <button
                            type="submit"
                            className="text-xs font-medium text-red-500 hover:underline"
                          >
                            Delete
                          </button>
                        </form>
                      </td>
                    )}
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
