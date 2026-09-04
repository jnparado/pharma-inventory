export function PageLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading page">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-slate-200" />
        <div className="h-4 w-full max-w-xl rounded bg-slate-100" />
      </div>
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-6">
        <div className="mb-4 h-5 w-40 rounded bg-slate-200" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProductsLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading products">
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-6">
        <div className="mb-4 flex justify-between gap-3">
          <div className="h-5 w-44 rounded bg-slate-200" />
          <div className="h-9 w-28 rounded-lg bg-slate-200" />
        </div>
        <div className="space-y-2 border-t border-slate-100 pt-4">
          <div className="flex gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-3 flex-1 rounded bg-slate-100" />
            ))}
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex gap-3 py-2">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="h-4 flex-1 rounded bg-slate-100" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
