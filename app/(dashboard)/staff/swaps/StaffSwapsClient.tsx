"use client";

import { useSwapRequests, type SwapRequest } from "@/hooks/queries/useSwapRequests";
import { useSwapAction } from "@/hooks/mutations/useSwapMutations";
import { formatRangeForLocation } from "@/lib/timezone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  pending:   "text-amber-400 border-amber-800/40 bg-amber-900/10",
  accepted:  "text-teal-400 border-teal-800/40 bg-teal-900/10",
  claimed:   "text-teal-400 border-teal-800/40 bg-teal-900/10",
  approved:  "text-green-400 border-green-800/40 bg-green-900/10",
  rejected:  "text-red-400 border-red-800/40 bg-red-900/10",
  cancelled: "text-muted-foreground",
  expired:   "text-muted-foreground",
};

export function StaffSwapsClient({ initialSwaps, userId }: { initialSwaps: SwapRequest[]; userId: string }) {
  const { data: swaps = initialSwaps } = useSwapRequests();
  const action = useSwapAction();

  if (swaps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-48 border border-border rounded-md p-8 text-center">
        <ArrowLeftRight className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium">No swap or drop requests</p>
        <p className="text-xs text-muted-foreground mt-1">Requests you initiate or receive will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {swaps.map((swap) => {
        const shift = swap.shiftAssignment.shift;
        const timeRange = formatRangeForLocation(new Date(shift.startUtc), new Date(shift.endUtc), shift.location.timezone);
        const isRequester = swap.requester.id === userId;
        const isTarget = swap.target?.id === userId;
        const statusStyle = STATUS_STYLES[swap.status] ?? "";
        const canCancel = isRequester && ["pending", "accepted", "claimed"].includes(swap.status);
        const canAccept = isTarget && swap.status === "pending";

        return (
          <div key={swap.id} className="bg-card border border-border rounded-md flex flex-col">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] capitalize">{swap.type}</Badge>
                <Badge variant="outline" className={cn("text-[10px] capitalize", statusStyle)}>{swap.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {isRequester ? "You initiated" : `From ${swap.requester.name}`}
              </p>
            </div>

            {/* Body */}
            <div className="px-4 py-3 flex-1 space-y-2">
              <p className="text-sm font-semibold">{shift.location.name}</p>
              <p className="font-mono text-sm text-teal-400">{timeRange}</p>
              <p className="text-xs text-muted-foreground capitalize">{shift.requiredSkill.name}</p>

              {/* Participant flow */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                <span className={isRequester ? "text-foreground font-medium" : ""}>{swap.requester.name}</span>
                {swap.target && (
                  <>
                    <ArrowLeftRight className="h-3 w-3 shrink-0" />
                    <span className={isTarget ? "text-foreground font-medium" : ""}>{swap.target.name}</span>
                  </>
                )}
              </div>
            </div>

            {/* Footer — actions */}
            {(canAccept || canCancel) && (
              <div className="px-4 py-2.5 border-t border-border flex gap-2 justify-end">
                {canAccept && (
                  <Button size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                    disabled={action.isPending}
                    onClick={() => action.mutate({ id: swap.id, action: "accept" })}>
                    Accept Swap
                  </Button>
                )}
                {canCancel && (
                  <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:text-destructive"
                    disabled={action.isPending}
                    onClick={() => action.mutate({ id: swap.id, action: "cancel" })}>
                    Cancel
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
