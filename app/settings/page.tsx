import Link from "next/link";
import { signOut } from "@/app/actions/user";
import { Badge, Card, PageHeader, SetupNotice, buttonClass } from "@/components/ui";
import { isAiConfigured } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/data";
import { isAdmin } from "@/lib/permissions";
import { getActiveUser, getAuthEmail } from "@/lib/user-session";
import { getInitials } from "@/lib/utils";


export default async function SettingsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader
          title="Settings"
          description="Manage your profile and application preferences."
        />
        <SetupNotice />
      </>
    );
  }

  const [activeUser, authEmail] = await Promise.all([
    getActiveUser(),
    getAuthEmail(),
  ]);
  const aiReady = isAiConfigured();
  const userIsAdmin = isAdmin(activeUser);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your profile and application preferences."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Signed in">
          {activeUser ? (
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-sm font-semibold text-blue-700">
                {getInitials(activeUser.full_name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-800">
                  {activeUser.full_name}
                </p>
                <p className="truncate text-sm text-slate-500">
                  {authEmail ?? activeUser.email}
                </p>
                <Badge tone="success">
                  <span className="capitalize">{activeUser.role}</span>
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Signed in as <strong>{authEmail}</strong>, but no staff profile
              matches this email. Ask an admin to create your account in{" "}
              <Link href="/users" className="text-blue-600 hover:underline">
                User Accounts
              </Link>
              .
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/profile" className={buttonClass}>
              My profile
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </Card>

        {userIsAdmin && (
          <Card title="Administration">
            <p className="text-sm text-slate-600">
              Manage staff accounts, assign roles, and set login passwords.
            </p>
            <Link href="/users" className={`${buttonClass} mt-4 inline-block`}>
              Manage user accounts
            </Link>
          </Card>
        )}

        <Card title="System status">
          <dl className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">Database (Supabase)</dt>
              <dd>
                <Badge tone="success">Connected</Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">Authentication</dt>
              <dd>
                <Badge tone="success">Email login</Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">AI assistant (Grok)</dt>
              <dd>
                <Badge tone={aiReady ? "success" : "warning"}>
                  {aiReady ? "Configured" : "Not configured"}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">Currency</dt>
              <dd className="font-medium text-slate-800">PHP (₱)</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">Application</dt>
              <dd className="font-medium text-slate-800">PharmaStock</dd>
            </div>
          </dl>
          {!aiReady && (
            <p className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Add <code className="font-mono">XAI_API_KEY</code> to{" "}
              <code className="font-mono">.env.local</code> to enable AI forecast
              and chatbot features.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
