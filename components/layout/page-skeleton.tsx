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

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title */}
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Controls row — week buttons + location select */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          <Skeleton className="h-7 w-10 rounded" />
          <Skeleton className="h-7 w-10 rounded" />
          <Skeleton className="h-7 w-10 rounded" />
        </div>
        <Skeleton className="h-8 w-44 rounded-md" />
      </div>

      {/* Fairness score banner */}
      <div className="border border-border rounded-md p-4 flex items-center gap-6">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
        <div className="border-l border-border pl-6 space-y-1.5">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-6 w-8" />
        </div>
        <div className="border-l border-border pl-6 flex-1 hidden sm:block space-y-1.5">
          <Skeleton className="h-3 w-full max-w-xs" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>

      {/* lg: 2-col charts + 1-col table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Charts — left 2 cols */}
        <div className="lg:col-span-2 grid grid-cols-1 gap-4">
          <Skeleton className="h-80 rounded-md" />
          <Skeleton className="h-80 rounded-md" />
        </div>

        {/* Staff table — right col */}
        <div className="lg:col-span-1 space-y-2">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3 py-1.5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-2.5 w-10" />
            <Skeleton className="h-2.5 w-8" />
            <Skeleton className="h-2.5 w-12" />
          </div>
          {/* Staff rows */}
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="border border-border rounded-md px-3 py-3 space-y-2">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-10" />
                <Skeleton className="h-3.5 w-6" />
                <Skeleton className="h-3.5 w-12" />
              </div>
              <Skeleton className="h-1 rounded-full w-full" />
              <Skeleton className="h-1 rounded-full" style={{ width: `${55 + (i * 7) % 40}%` }} />
            </div>
          ))}
        </div>
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
