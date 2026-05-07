"use client";

import { useSwapRequests, type SwapRequest } from "@/hooks/queries/useSwapRequests";
import { useSwapAction } from "@/hooks/mutations/useSwapMutations";
import { formatRangeForLocation } from "@/lib/timezone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_COLOR: Record<string, string> = {
  pending: "text-yellow-400 border-yellow-800/40",
  accepted: "text-teal-400 border-teal-800/40",
  claimed: "text-teal-400 border-teal-800/40",
  approved: "text-green-400 border-green-800/40",
  rejected: "text-red-400 border-red-800/40",
  cancelled: "text-muted-foreground",
  expired: "text-muted-foreground",
};

export function StaffSwapsClient({ initialSwaps, userId }: { initialSwaps: SwapRequest[]; userId: string }) {
  const { data: swaps = initialSwaps } = useSwapRequests();
  const action = useSwapAction();

  if (swaps.length === 0) return <p className="text-sm text-muted-foreground">No swap or drop requests.</p>;

  return (
    <div className="space-y-3">
      {swaps.map((swap) => {
        const shift = swap.shiftAssignment.shift;
        const timeRange = formatRangeForLocation(new Date(shift.startUtc), new Date(shift.endUtc), shift.location.timezone);
        const isRequester = swap.requester.id === userId;
        const isTarget = swap.target?.id === userId;

        return (
          <div key={swap.id} className="bg-card border border-border rounded-md p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px] capitalize">{swap.type}</Badge>
                  <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_COLOR[swap.status] ?? ""}`}>{swap.status}</Badge>
                </div>
                <p className="text-sm font-medium mt-1">{shift.location.name}</p>
                <p className="font-mono text-xs text-teal-400">{timeRange}</p>
                <p className="text-xs text-muted-foreground capitalize">{shift.requiredSkill.name}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {isRequester ? "You initiated this request" : `Requested by ${swap.requester.name}`}
              {swap.target && ` → ${isTarget ? "you" : swap.target.name}`}
            </p>

            {/* Staff B can accept a pending swap targeted at them */}
            {isTarget && swap.status === "pending" && (
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={action.isPending}
                  onClick={() => action.mutate({ id: swap.id, action: "accept" })}>
                  Accept Swap
                </Button>
              </div>
            )}

            {/* Requester can cancel before approval */}
            {isRequester && ["pending", "accepted", "claimed"].includes(swap.status) && (
              <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:text-destructive"
                disabled={action.isPending}
                onClick={() => action.mutate({ id: swap.id, action: "cancel" })}>
                Cancel Request
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
