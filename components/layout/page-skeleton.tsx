import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  rows?: number;
  hasHeader?: boolean;
}

export function PageSkeleton({ rows = 4, hasHeader = true }: PageSkeletonProps) {
  return (
    <div className="space-y-5 animate-pulse">
      {hasHeader && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="border border-border rounded-md p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-7 w-16 rounded-md shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      <div className="border border-border rounded-md overflow-hidden">
        <div className="border-b border-border bg-muted/30 px-4 py-2.5 flex gap-6">
          {[80, 120, 100, 80].map((w, i) => (
            <Skeleton key={i} className={`h-3 w-${w === 80 ? "20" : w === 120 ? "28" : w === 100 ? "24" : "20"}`} />
          ))}
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="px-4 py-3 flex gap-6 border-b border-border last:border-0">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function GridSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-5 w-full rounded-sm" />
            {Array.from({ length: 2 + (i % 3) }, (_, j) => (
              <Skeleton key={j} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
