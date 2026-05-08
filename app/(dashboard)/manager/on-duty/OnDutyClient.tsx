"use client";

import { useQuery } from "@tanstack/react-query";
import { formatRangeForLocation } from "@/lib/timezone";
import { Badge } from "@/components/ui/badge";

interface OnDutyAssignment {
  id: string;
  userId: string;
  user: { id: string; name: string };
  shift: {
    id: string;
    startUtc: string;
    endUtc: string;
    location: { id: string; name: string; timezone: string };
    requiredSkill: { id: string; name: string };
    isPremium: boolean;
    isOvernight: boolean;
  };
}

function shiftProgress(startUtc: string, endUtc: string): number {
  const now = Date.now();
  const start = new Date(startUtc).getTime();
  const end = new Date(endUtc).getTime();
  return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
}

function timeRemaining(endUtc: string): string {
  const mins = Math.max(0, Math.round((new Date(endUtc).getTime() - Date.now()) / 60000));
  if (mins < 60) return `${mins}m left`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m left` : `${h}h left`;
}

export function OnDutyClient({ initialAssignments }: { initialAssignments: OnDutyAssignment[] }) {
  // 60-second polling covers time-based transitions (no DB write when clock passes startUtc/endUtc)
  const { data: assignments = initialAssignments } = useQuery<OnDutyAssignment[]>({
    queryKey: ["on-duty"],
    queryFn: async () => {
      const res = await fetch("/api/on-duty");
      if (!res.ok) throw new Error("Failed to load on-duty");
      return res.json();
    },
    initialData: initialAssignments,
    staleTime: 0,
    refetchInterval: 60_000,
  });

  // Group by location, preserve insertion order (already sorted by location name from server)
  const byLocation = assignments.reduce<
    Record<string, { id: string; name: string; timezone: string; assignments: OnDutyAssignment[] }>
  >((acc, a) => {
    const { id, name, timezone } = a.shift.location;
    if (!acc[id]) acc[id] = { id, name, timezone, assignments: [] };
    acc[id].assignments.push(a);
    return acc;
  }, {});

  const locations = Object.values(byLocation);
  const totalOnDuty = assignments.length;

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-48 bg-card border border-border rounded-md p-8 text-center">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3 text-xl">😴</div>
        <p className="text-sm font-medium text-foreground">No staff on duty</p>
        <p className="text-xs text-muted-foreground mt-1">Check back when shifts are underway.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Live summary strip */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-green-400 font-medium">Live</span>
        </span>
        <span className="text-border">·</span>
        <span>{totalOnDuty} staff on duty across {locations.length} location{locations.length !== 1 ? "s" : ""}</span>
        <span className="text-border">·</span>
        <span>Refreshes every 60s</span>
      </div>

      {/* Location columns — 1 col → 2 on sm → 4 on lg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {locations.map((loc) => (
          <div key={loc.id} className="border border-border rounded-md overflow-hidden">
            {/* Column header */}
            <div className="px-3 py-2.5 border-b border-border bg-card flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                <p className="text-xs font-semibold truncate">{loc.name}</p>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                {loc.assignments.length} on duty
              </span>
            </div>

            {/* Staff cards */}
            <div className="divide-y divide-border">
              {loc.assignments.map((a) => {
                const timeRange = formatRangeForLocation(
                  new Date(a.shift.startUtc),
                  new Date(a.shift.endUtc),
                  loc.timezone
                );
                const pct = shiftProgress(a.shift.startUtc, a.shift.endUtc);
                const remaining = timeRemaining(a.shift.endUtc);

                return (
                  <div key={a.id} className="px-3 pt-3 pb-2 bg-card space-y-2">
                    {/* Name */}
                    <p className="text-sm font-medium leading-tight">{a.user.name}</p>

                    {/* Time range */}
                    <p className="font-mono text-[11px] text-teal-400 leading-none">{timeRange}</p>

                    {/* Badges */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] capitalize h-4 px-1">
                        {a.shift.requiredSkill.name}
                      </Badge>
                      {a.shift.isPremium && (
                        <Badge className="text-[10px] h-4 px-1 bg-amber-800/60 text-amber-300 border-0">
                          ★ Premium
                        </Badge>
                      )}
                    </div>

                    {/* Elapsed progress bar */}
                    <div className="space-y-1">
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                        <span>{Math.round(pct)}% complete</span>
                        <span>{remaining}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
