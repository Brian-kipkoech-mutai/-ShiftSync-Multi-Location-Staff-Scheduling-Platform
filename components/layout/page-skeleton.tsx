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

export function ManagerSettingsSkeleton() {
  return (
    <div className="space-y-5 max-w-md animate-pulse">
      <Skeleton className="h-6 w-28" />

      {/* Profile card */}
      <div className="border border-border rounded-md p-4 space-y-3">
        <Skeleton className="h-4 w-16" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3.5 w-40" />
        </div>
      </div>

      {/* Notification prefs card */}
      <div className="border border-border rounded-md p-4 space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-52" />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function OvertimeSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Title + subtitle */}
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Horizontal bar chart card */}
      <div className="border border-border rounded-md p-4 space-y-3">
        <Skeleton className="h-3 w-44" />
        <div className="space-y-2.5">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-12 shrink-0" />
              <Skeleton
                className="h-5 rounded-sm"
                style={{ width: `${30 + ((i * 13 + 7) % 55)}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Staff rows */}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="border border-border rounded-md p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28" />
                {i < 2 && <Skeleton className="h-4 w-20 rounded-full" />}
              </div>
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-1.5 w-full rounded-full mt-1" />
            </div>
            <div className="text-right space-y-1 shrink-0">
              <Skeleton className="h-6 w-14 ml-auto" />
              <Skeleton className="h-3 w-16 ml-auto" />
            </div>
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex gap-4 pt-2 px-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function OnDutySkeleton({ cols = 4 }: { cols?: number }) {
  const colCounts = [2, 3, 1, 2]; // staff cards per location column
  return (
    <div className="space-y-4 animate-pulse">
      {/* Title */}
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Live summary strip */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-px" />
        <Skeleton className="h-3 w-44" />
      </div>

      {/* Location columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {Array.from({ length: cols }, (_, i) => (
          <div key={i} className="border border-border rounded-md overflow-hidden">
            {/* Column header */}
            <div className="px-3 py-2.5 border-b border-border flex items-center justify-between gap-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-14" />
            </div>

            {/* Staff cards */}
            {Array.from({ length: colCounts[i % colCounts.length] }, (_, j) => (
              <div key={j} className="px-3 pt-3 pb-2 border-b border-border last:border-0 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-32" />
                <div className="flex gap-1">
                  <Skeleton className="h-4 w-16 rounded-sm" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-1 w-full rounded-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-2.5 w-16" />
                    <Skeleton className="h-2.5 w-14" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScheduleSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        {/* Week nav */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-sm" />
          <Skeleton className="h-8 w-8 rounded-sm" />
          <Skeleton className="h-5 w-44" />
        </div>
        {/* Right side: legend (lg only) + location selector + button */}
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="hidden lg:flex items-center gap-3 mr-1">
            {[44, 52, 40, 60].map((w, i) => (
              <Skeleton key={i} className={`h-3 w-${w === 44 ? "11" : w === 52 ? "14" : w === 40 ? "10" : "16"}`} />
            ))}
          </div>
          <Skeleton className="h-8 w-36 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>

      {/* Publish bar */}
      <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-border">
        <Skeleton className="h-3.5 w-32 flex-1" />
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>

      {/* 7-col week grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden border border-border min-w-140">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="bg-card flex flex-col min-h-32 lg:min-h-130">
            {/* Day header */}
            <div className="flex flex-col items-center justify-center border-b border-border py-2 lg:py-3 gap-1">
              <Skeleton className="h-2.5 w-7 lg:w-14" />
              <Skeleton className="h-4 w-5" />
            </div>
            {/* Shift cards */}
            <div className="p-1 space-y-1">
              {Array.from({ length: i % 3 === 0 ? 2 : i % 3 === 1 ? 1 : 3 }, (_, j) => (
                <div key={j} className="rounded-md border border-border px-2 py-1.5 space-y-1.5">
                  <div className="flex justify-between gap-1">
                    <Skeleton className="h-2.5 w-3/4" />
                    <Skeleton className="h-2.5 w-5" />
                  </div>
                  <Skeleton className="h-2 w-1/2" />
                  <Skeleton className="h-4 w-14 rounded-sm" />
                  <Skeleton className="h-2 w-2/3" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend (sm only) */}
      <div className="flex items-center gap-4 lg:hidden">
        {[40, 52, 44, 60].map((w, i) => (
          <Skeleton key={i} className={`h-3 w-${w === 40 ? "10" : w === 52 ? "14" : w === 44 ? "11" : "16"}`} />
        ))}
      </div>
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title */}
      <Skeleton className="h-6 w-56" />

      {/* 3 stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[120, 96, 136].map((w, i) => (
          <div key={i} className="bg-card border border-border rounded-md p-4 space-y-2">
            <Skeleton className="h-8 w-10" />
            <Skeleton className={`h-4 w-${w === 120 ? "28" : w === 96 ? "24" : "32"}`} />
          </div>
        ))}
      </div>

      {/* Welcome line */}
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

export function LocationsSkeleton() {
  const cards = [
    { name: "w-28", mgr1: "w-20", mgr2: "w-24" },
    { name: "w-32", mgr1: "w-24", mgr2: "w-20" },
    { name: "w-24", mgr1: "w-28", mgr2: "w-16" },
    { name: "w-36", mgr1: "w-20", mgr2: "w-24" },
  ];

  return (
    <div className="space-y-5 animate-pulse">
      <Skeleton className="h-6 w-28" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
        {cards.map((c, i) => (
          <div key={i} className="border border-border rounded-md p-4 space-y-3">
            {/* Name + timezone */}
            <div className="space-y-1.5">
              <Skeleton className={`h-4 ${c.name}`} />
              <Skeleton className="h-3 w-40" />
            </div>

            {/* Stats grid — 2 rows × 2 cols */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-6" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-6" />
            </div>

            {/* Managers */}
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-14" />
              <div className="flex gap-1.5">
                <Skeleton className={`h-5 ${c.mgr1} rounded`} />
                <Skeleton className={`h-5 ${c.mgr2} rounded`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-4 max-w-md animate-pulse">
      {/* Title + subtitle */}
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Notification prefs card */}
      <div className="border border-border rounded-md p-4 space-y-3">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-6 w-10 rounded-full" />
        </div>
      </div>

      {/* Section label */}
      <Skeleton className="h-3 w-40 mt-2" />

      {/* 3 setting rows */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="border border-border rounded-md p-4 space-y-2.5">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40 font-mono" />
            <Skeleton className="h-3 w-full max-w-xs" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-16 rounded-md" />
          </div>
          <Skeleton className="h-3 w-36" />
        </div>
      ))}
    </div>
  );
}

// Card widths vary per card to feel natural, not mechanical
const CARD_WIDTHS = [
  { name: "w-28", email: "w-36", tz: "w-20", hrs: "w-16", skill1: "w-14", skill2: "w-16", skill3: "w-12", cert1: "w-20", cert2: "w-24" },
  { name: "w-32", email: "w-40", tz: "w-24", hrs: "w-12", skill1: "w-16", skill2: "w-12", skill3: "w-18", cert1: "w-24", cert2: "w-20" },
  { name: "w-24", email: "w-32", tz: "w-20", hrs: "w-16", skill1: "w-12", skill2: "w-20", skill3: "w-14", cert1: "w-20", cert2: "w-16" },
  { name: "w-36", email: "w-44", tz: "w-16", hrs: "w-14", skill1: "w-18", skill2: "w-14", skill3: "w-10", cert1: "w-28", cert2: "w-20" },
  { name: "w-28", email: "w-36", tz: "w-20", hrs: "w-12", skill1: "w-14", skill2: "w-16", skill3: "w-20", cert1: "w-24", cert2: "w-18" },
  { name: "w-32", email: "w-40", tz: "w-24", hrs: "w-16", skill1: "w-16", skill2: "w-12", skill3: "w-14", cert1: "w-20", cert2: "w-24" },
];

export function StaffGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Centered search */}
      <div className="flex flex-col items-center gap-1">
        <Skeleton className="h-9 lg:h-10 w-full max-w-sm lg:max-w-lg rounded-md" />
        <Skeleton className="h-3 w-20" />
      </div>

      {/* 3-col card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: cards }, (_, i) => {
          const w = CARD_WIDTHS[i % CARD_WIDTHS.length];
          return (
            <div key={i} className="border border-border rounded-md flex flex-col">
              {/* Card header */}
              <div className="px-4 pt-4 pb-3 border-b border-border space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5 min-w-0">
                    <Skeleton className={`h-4 ${w.name}`} />
                    <Skeleton className={`h-3 ${w.email}`} />
                  </div>
                  <Skeleton className="h-5 w-12 rounded-full shrink-0" />
                </div>
                {/* Meta row */}
                <div className="flex items-center gap-3 pt-0.5">
                  <Skeleton className={`h-3 ${w.tz}`} />
                  <Skeleton className={`h-3 ${w.hrs}`} />
                </div>
              </div>

              {/* Card body */}
              <div className="px-4 py-3 space-y-4 flex-1">
                {/* Skills */}
                <div className="space-y-1.5">
                  <Skeleton className="h-2.5 w-10" />
                  <div className="flex gap-1.5 flex-wrap">
                    <Skeleton className={`h-5 ${w.skill1} rounded-full`} />
                    <Skeleton className={`h-5 ${w.skill2} rounded-full`} />
                    <Skeleton className={`h-5 ${w.skill3} rounded-full`} />
                  </div>
                </div>

                {/* Certified locations */}
                <div className="space-y-1.5">
                  <Skeleton className="h-2.5 w-28" />
                  <div className="flex gap-1.5 flex-wrap">
                    <Skeleton className={`h-5 ${w.cert1} rounded`} />
                    <Skeleton className={`h-5 ${w.cert2} rounded`} />
                  </div>
                </div>

                {/* Grant access */}
                <div className="space-y-1.5">
                  <Skeleton className="h-2.5 w-20" />
                  <div className="flex gap-1">
                    <Skeleton className="h-6 w-24 rounded-md" />
                  </div>
                </div>
              </div>

              {/* Card footer */}
              <div className="px-4 py-2.5 border-t border-border flex justify-end">
                <Skeleton className="h-7 w-20 rounded-md" />
              </div>
            </div>
          );
        })}
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
