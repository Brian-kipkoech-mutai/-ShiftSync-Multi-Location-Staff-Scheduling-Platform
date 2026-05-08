"use client";

import { useQuery } from "@tanstack/react-query";
import { useSwapAction } from "@/hooks/mutations/useSwapMutations";
import { formatRangeForLocation, formatDateForLocation } from "@/lib/timezone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, CalendarDays, UserCircle2 } from "lucide-react";
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
    return (
      <div className="flex flex-col items-center justify-center min-h-48 border border-border rounded-md p-8 text-center">
        <CalendarDays className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium">No shifts available</p>
        <p className="text-xs text-muted-foreground mt-1">Check back later — dropped shifts will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {drops.map((drop) => {
        const shift = drop.shiftAssignment.shift;
        const timeRange = formatRangeForLocation(new Date(shift.startUtc), new Date(shift.endUtc), shift.location.timezone);
        const dateStr = formatDateForLocation(new Date(shift.startUtc), shift.location.timezone);

        return (
          <div key={drop.id} className="bg-card border border-border rounded-md flex flex-col">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-border space-y-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                <p className="text-sm font-semibold truncate">{shift.location.name}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {dateStr}
              </div>
            </div>

            {/* Body */}
            <div className="px-4 py-3 flex-1 space-y-3">
              <p className="font-mono text-lg text-teal-400 leading-tight">{timeRange}</p>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-[10px] capitalize">{shift.requiredSkill.name}</Badge>
                {shift.isPremium && <Badge className="text-[10px] bg-amber-800/60 text-amber-300 border-0">★ Premium</Badge>}
                {shift.isOvernight && <Badge variant="outline" className="text-[10px]">Overnight</Badge>}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <UserCircle2 className="h-3 w-3" />
                Dropped by {drop.requester.name}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-border flex justify-end">
              <Button
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white h-7 text-xs"
                disabled={action.isPending}
                onClick={() => action.mutate({ id: drop.id, action: "claim" })}
              >
                Pick Up Shift
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
