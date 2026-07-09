import Link from "next/link";
import { createUser, deleteUser, updateUser } from "@/app/actions/user";
import { RoleSelect } from "@/components/role-select";
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
import {
  getBranches,
  getUserById,
  getUsers,
  isSupabaseConfigured,
} from "@/lib/data";
import { canManageRecords } from "@/lib/permissions";
import { getActiveUser } from "@/lib/user-session";
import { formatDateTime, getInitials } from "@/lib/utils";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; edit?: string }>;
}) {
  const { success, error, edit } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="User accounts" />
        <SetupNotice />
      </>
    );
  }

  const activeUser = await getActiveUser();
  if (!canManageRecords(activeUser)) {
    return (
      <>
        <PageHeader
          title="User accounts"
          description="Create and manage staff accounts, roles, and branch assignments."
        />
        <Card>
          <p className="text-sm text-slate-600">
            Admin access is required to manage user accounts. Switch to an admin
            profile in{" "}
            <Link href="/settings" className="font-medium text-teal-600 hover:underline">
              Settings
            </Link>
            .
          </p>
        </Card>
      </>
    );
  }

  const [users, branches, editing] = await Promise.all([
    getUsers(),
    getBranches(),
    edit ? getUserById(edit) : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader
        title="User accounts"
        description="Create staff accounts and assign roles and permissions."
      />
      <FlashMessage success={success} error={error} />

      {editing && (
        <Card title="Edit user" className="mb-6">
          <form
            action={updateUser}
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
                defaultValue={editing.full_name}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="edit_email">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="edit_email"
                name="email"
                type="email"
                required
                defaultValue={editing.email}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="edit_role">
                Role <span className="text-red-500">*</span>
              </label>
              <RoleSelect id="edit_role" defaultValue={editing.role} />
            </div>
            <div>
              <label className={labelClass} htmlFor="edit_branch_id">
                Branch
              </label>
              <select
                id="edit_branch_id"
                name="branch_id"
                defaultValue={editing.branch_id ?? ""}
                className={inputClass}
              >
                <option value="">No branch assigned</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
              <button type="submit" className={buttonClass}>
                Save changes
              </button>
              <Link
                href="/users"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </Card>
      )}

      {!editing && (
        <Card title="Create user account" className="mb-6">
          <form
            action={createUser}
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
                placeholder="Juan Dela Cruz"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="email">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="juan@pharmacy.ph"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="role">
                Role <span className="text-red-500">*</span>
              </label>
              <RoleSelect id="role" defaultValue="cashier" />
            </div>
            <div>
              <label className={labelClass} htmlFor="branch_id">
                Branch
              </label>
              <select
                id="branch_id"
                name="branch_id"
                defaultValue=""
                className={inputClass}
              >
                <option value="">No branch assigned</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <button type="submit" className={buttonClass}>
                Create account
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card title={`Staff accounts (${users.length})`}>
        {users.length === 0 ? (
          <EmptyState message="No user accounts yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-medium">User</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Branch</th>
                  <th className="pb-2 font-medium">Created</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const branchName =
                    branches.find((b) => b.id === u.branch_id)?.name ?? "—";
                  const isSelf = activeUser?.id === u.id;

                  return (
                    <tr key={u.id}>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-xs font-semibold text-teal-700">
                            {getInitials(u.full_name)}
                          </span>
                          <span>
                            <span className="block font-medium text-slate-700">
                              {u.full_name}
                              {isSelf && (
                                <span className="ml-2 text-xs font-normal text-slate-400">
                                  (you)
                                </span>
                              )}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {u.email}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge tone={u.role === "admin" ? "success" : "info"}>
                          <span className="capitalize">{u.role}</span>
                        </Badge>
                      </td>
                      <td className="py-3 text-slate-500">{branchName}</td>
                      <td className="py-3 text-slate-500">
                        {u.created_at ? formatDateTime(u.created_at) : "—"}
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <Link
                          href={`/users?edit=${u.id}`}
                          className="mr-3 text-xs font-medium text-teal-600 hover:underline"
                        >
                          Edit
                        </Link>
                        {!isSelf && (
                          <form action={deleteUser} className="inline">
                            <input type="hidden" name="id" value={u.id} />
                            <button
                              type="submit"
                              className="text-xs font-medium text-red-500 hover:underline"
                            >
                              Delete
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          <p className="font-medium text-slate-600">Role permissions</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <strong>Admin</strong> — full management: products, customers,
              suppliers, and user accounts
            </li>
            <li>
              <strong>Manager</strong> — operations oversight (reports, orders,
              stock)
            </li>
            <li>
              <strong>Pharmacist</strong> — dispensing, prescriptions, stock
            </li>
            <li>
              <strong>Cashier</strong> — POS and sales
            </li>
          </ul>
        </div>
      </Card>
    </>
  );
}
