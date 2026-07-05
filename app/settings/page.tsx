import { setActiveUserFromForm } from "@/app/actions/user";
import { Badge, Card, PageHeader, SetupNotice } from "@/components/ui";
import { isAiConfigured } from "@/lib/env";
import { getUsers, isSupabaseConfigured } from "@/lib/data";
import { getActiveUser } from "@/lib/user-session";
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

  const [users, activeUser] = await Promise.all([getUsers(), getActiveUser()]);
  const aiReady = isAiConfigured();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your profile and application preferences."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Active profile">
          {users.length === 0 ? (
            <p className="text-sm text-slate-500">
              No users found. Add a row to the{" "}
              <code className="rounded bg-slate-100 px-1 text-xs">users</code>{" "}
              table in Supabase.
            </p>
          ) : (
            <ul className="space-y-2">
              {users.map((u) => {
                const isActive = activeUser?.id === u.id;
                return (
                  <li key={u.id}>
                    <form action={setActiveUserFromForm}>
                      <input type="hidden" name="user_id" value={u.id} />
                      <button
                        type="submit"
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                          isActive
                            ? "border-indigo-200 bg-indigo-50"
                            : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-sm font-semibold text-teal-700">
                          {getInitials(u.full_name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-slate-800">
                            {u.full_name}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {u.email}
                          </span>
                        </span>
                        <span className="shrink-0">
                          {isActive ? (
                            <Badge tone="success">Active</Badge>
                          ) : (
                            <span className="text-xs text-slate-400">Switch</span>
                          )}
                        </span>
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="System status">
          <dl className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">Database (Supabase)</dt>
              <dd>
                <Badge tone="success">Connected</Badge>
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
