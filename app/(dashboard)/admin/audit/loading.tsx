export default function Loading() {
  return (
    <div>
      <div className="h-5 w-24 bg-muted rounded animate-pulse mb-1" />
      <div className="h-4 w-56 bg-muted rounded animate-pulse mb-5" />
      <div className="flex items-center gap-2 mb-4">
        <div className="h-9 w-64 bg-muted rounded animate-pulse" />
        <div className="h-9 w-24 bg-muted rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-md p-3 flex flex-col gap-2 animate-pulse">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-14 bg-muted rounded" />
                <div className="h-3 bg-muted rounded w-20" />
              </div>
              <div className="h-3 bg-muted rounded w-16 shrink-0" />
            </div>
            <div className="h-3 bg-muted rounded w-2/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
