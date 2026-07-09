import { LoginForm } from "@/components/login-form";
import { FlashMessage, SetupNotice } from "@/components/ui";
import { listAuthUsersForLogin } from "@/lib/auth-users";
import { isSupabaseConfigured } from "@/lib/data";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#10172A] p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <SetupNotice />
        </div>
      </div>
    );
  }

  let authUsers: Awaited<ReturnType<typeof listAuthUsersForLogin>> = [];
  let loadError: string | undefined;

  try {
    authUsers = await listAuthUsersForLogin();
  } catch (e) {
    loadError = (e as Error).message;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#10172A] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 text-lg font-black text-white">
            Rx
          </div>
          <h1 className="text-2xl font-bold text-slate-900">PharmaStock</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to open your dashboard
          </p>
        </div>

        {loadError && <FlashMessage error={loadError} />}

        <LoginForm
          authUsers={authUsers}
          next={next ?? "/"}
          initialError={error}
        />

        <p className="mt-6 text-center text-xs text-slate-400">
          Admins can add login accounts in User Accounts.
        </p>
      </div>
    </div>
  );
}
