"use client";

import { useQuery } from "@tanstack/react-query";
import { useSwapAction } from "@/hooks/mutations/useSwapMutations";
import { formatRangeForLocation, formatDateForLocation } from "@/lib/timezone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SwapRequest } from "@/hooks/queries/useSwapRequests";

export function AvailableDropsClient({ initialDrops }: { initialDrops: SwapRequest[] }) {
  const { data: drops = initialDrops } = useQuery<SwapRequest[]>({
    queryKey: ["available-drops"],
    queryFn: async () => {
      const res = await fetch("/api/shifts/available");
      if (!res.ok) throw new Error("Failed to load available shifts");
      return res.json();
    },
    initialData: initialDrops,
    staleTime: 30_000,
  });

  const action = useSwapAction();

  if (drops.length === 0) {
    return <p className="text-sm text-muted-foreground">No shifts available to pick up right now.</p>;
  }

  return (
    <div className="space-y-3">
      {drops.map((drop) => {
        const shift = drop.shiftAssignment.shift;
        const timeRange = formatRangeForLocation(new Date(shift.startUtc), new Date(shift.endUtc), shift.location.timezone);
        const dateStr = formatDateForLocation(new Date(shift.startUtc), shift.location.timezone);

        return (
          <div key={drop.id} className="bg-card border border-border rounded-md p-4 flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{shift.location.name}</p>
              <p className="text-xs text-muted-foreground">{dateStr}</p>
              <p className="font-mono text-sm text-teal-400">{timeRange}</p>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                <Badge variant="secondary" className="text-[10px] capitalize">{shift.requiredSkill.name}</Badge>
                {shift.isPremium && <Badge className="text-[10px] bg-amber-800/60 text-amber-300 border-0">★ Premium</Badge>}
                {shift.isOvernight && <Badge variant="outline" className="text-[10px]">Overnight</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Dropped by {drop.requester.name}</p>
            </div>
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white h-8 text-xs shrink-0"
              disabled={action.isPending}
              onClick={() => action.mutate({ id: drop.id, action: "claim" })}
            >
              Pick Up
            </Button>
          </div>
        );
      })}
    </div>
  );
}
