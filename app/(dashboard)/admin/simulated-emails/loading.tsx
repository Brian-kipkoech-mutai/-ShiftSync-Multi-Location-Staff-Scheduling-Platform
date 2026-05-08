export default function Loading() {
  return (
    <div>
      <div className="h-5 w-40 bg-muted rounded animate-pulse mb-1" />
      <div className="h-4 w-72 bg-muted rounded animate-pulse mb-5" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-md p-4 flex flex-col gap-2 animate-pulse">
            <div className="flex items-start justify-between gap-2">
              <div className="h-3.5 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-16 shrink-0" />
            </div>
            <div className="h-3 bg-muted rounded w-2/5" />
            <div className="space-y-1.5 mt-1">
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-5/6" />
              <div className="h-3 bg-muted rounded w-4/6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
