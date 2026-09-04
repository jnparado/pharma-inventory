export function TopBarSkeleton() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="flex w-full items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-slate-100 md:hidden" />
          <div className="h-10 w-full max-w-xl animate-pulse rounded-lg bg-slate-100 lg:max-w-2xl" />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-100 sm:w-32" />
        </div>
      </div>
    </header>
  );
}
