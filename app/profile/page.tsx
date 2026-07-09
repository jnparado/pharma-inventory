import Link from "next/link";
import { updateUserProfile } from "@/app/actions/user";
import { RoleSelect } from "@/components/role-select";
import {
  Badge,
  Card,
  FlashMessage,
  PageHeader,
  SetupNotice,
  buttonClass,
  inputClass,
  labelClass,
} from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/data";
import { isAdmin } from "@/lib/permissions";
import { getActiveUser, getAuthEmail } from "@/lib/user-session";
import { formatDateTime, getInitials } from "@/lib/utils";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader title="My Profile" />
        <SetupNotice />
      </>
    );
  }

  const [user, authEmail] = await Promise.all([
    getActiveUser(),
    getAuthEmail(),
  ]);
  const userIsAdmin = isAdmin(user);

  if (!authEmail) {
    return (
      <>
        <PageHeader
          title="My Profile"
          description="Sign in to view and edit your profile."
        />
        <Card>
          <p className="text-sm text-slate-600">
            You are not signed in.{" "}
            <Link href="/login" className="font-medium text-teal-600 hover:underline">
              Go to login
            </Link>
            .
          </p>
        </Card>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <PageHeader title="My Profile" />
        <Card>
          <p className="text-sm text-slate-600">
            Signed in as <strong>{authEmail}</strong>, but no staff profile is
            linked to this email. Ask an admin to create your account in{" "}
            <Link href="/users" className="font-medium text-teal-600 hover:underline">
              User Accounts
            </Link>
            .
          </p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="My Profile"
        description="View and update your account details."
      />
      <FlashMessage success={success} error={error} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Account overview">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-xl font-bold text-teal-700">
              {getInitials(user.full_name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-slate-800">
                {user.full_name}
              </p>
              <p className="truncate text-sm text-slate-500">{user.email}</p>
              <Badge tone="success">
                <span className="capitalize">{user.role}</span>
              </Badge>
            </div>
          </div>
          {user.created_at && (
            <p className="mt-4 text-xs text-slate-400">
              Member since {formatDateTime(user.created_at)}
            </p>
          )}
        </Card>

        <Card title="Edit profile">
          <form action={updateUserProfile} className="grid gap-4" id="edit">
            <input type="hidden" name="id" value={user.id} />
            <div>
              <label className={labelClass} htmlFor="full_name">
                Full name
              </label>
              <input
                id="full_name"
                name="full_name"
                required
                defaultValue={user.full_name}
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
                required
                defaultValue={user.email}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="role">
                Role
              </label>
              {userIsAdmin ? (
                <RoleSelect id="role" defaultValue={user.role} />
              ) : (
                <>
                  <input type="hidden" name="role" value={user.role} />
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm capitalize text-slate-700">
                    {user.role}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Only admins can change roles. Contact your administrator.
                  </p>
                </>
              )}
            </div>
            <button type="submit" className={buttonClass}>
              Save changes
            </button>
          </form>
        </Card>
      </div>
    </>
  );
}
