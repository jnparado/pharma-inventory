import { signIn } from "@/app/actions/auth";
import {
  FlashMessage,
  SetupNotice,
  buttonClass,
  inputClass,
  labelClass,
} from "@/components/ui";
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#10172A] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 text-lg font-black text-white">
            Rx
          </div>
          <h1 className="text-2xl font-bold text-slate-900">PharmaStock</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to manage pharmacy inventory
          </p>
        </div>

        <FlashMessage error={error} />

        <form action={signIn} className="space-y-4">
          <input type="hidden" name="next" value={next ?? "/"} />
          <div>
            <label className={labelClass} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@pharmacy.ph"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputClass}
            />
          </div>
          <button type="submit" className={`${buttonClass} w-full`}>
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Accounts are created by an admin in User Accounts.
        </p>
      </div>
    </div>
  );
}
