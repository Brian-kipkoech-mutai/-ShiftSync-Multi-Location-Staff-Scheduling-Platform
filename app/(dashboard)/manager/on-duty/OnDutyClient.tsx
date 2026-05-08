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

export function OnDutyClient({ initialAssignments }: { initialAssignments: OnDutyAssignment[] }) {
  // Realtime covers assignment changes (new assign / remove) via useRealtimeSync.
  // It cannot cover time-based transitions — no DB row is written when the clock
  // passes a shift's startUtc or endUtc, so realtime never fires for those.
  // 60-second polling closes that gap: max lag before a shift appears/disappears
  // from the live view is one poll interval.
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

  // Group by location
  const byLocation = assignments.reduce<Record<string, { name: string; timezone: string; assignments: OnDutyAssignment[] }>>(
    (acc, a) => {
      const locId = a.shift.location.id;
      if (!acc[locId]) acc[locId] = { name: a.shift.location.name, timezone: a.shift.location.timezone, assignments: [] };
      acc[locId].assignments.push(a);
      return acc;
    },
    {}
  );

  if (assignments.length === 0) {
    return (
      <div className="bg-card border border-border rounded-md p-6 text-center">
        <div className="text-2xl mb-2">😴</div>
        <p className="text-sm text-muted-foreground">No staff currently on duty.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.values(byLocation).map((loc) => (
        <div key={loc.name}>
          <h2 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {loc.name}
          </h2>
          <div className="space-y-2">
            {loc.assignments.map((a) => {
              const timeRange = formatRangeForLocation(new Date(a.shift.startUtc), new Date(a.shift.endUtc), loc.timezone);
              return (
                <div key={a.id} className="bg-card border border-border rounded-md p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{a.user.name}</p>
                    <p className="font-mono text-xs text-teal-400">{timeRange}</p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    <Badge variant="secondary" className="text-[10px] capitalize">{a.shift.requiredSkill.name}</Badge>
                    {a.shift.isPremium && <Badge className="text-[10px] bg-amber-800/60 text-amber-300 border-0">★ Premium</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
