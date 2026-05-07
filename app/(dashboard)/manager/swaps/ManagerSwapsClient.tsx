"use client";

import { useState } from "react";
import { useSwapRequests, type SwapRequest } from "@/hooks/queries/useSwapRequests";
import { useSwapAction } from "@/hooks/mutations/useSwapMutations";
import { formatRangeForLocation } from "@/lib/timezone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ManagerSwapsClient({ initialSwaps }: { initialSwaps: SwapRequest[] }) {
  const { data: swaps = initialSwaps } = useSwapRequests();
  const action = useSwapAction();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  if (swaps.length === 0) {
    return <p className="text-sm text-muted-foreground">No pending swap or drop requests.</p>;
  }

  return (
    <div className="space-y-3">
      {swaps.map((swap) => {
        const shift = swap.shiftAssignment.shift;
        const timeRange = formatRangeForLocation(new Date(shift.startUtc), new Date(shift.endUtc), shift.location.timezone);
        const isRejecting = rejectId === swap.id;

        return (
          <div key={swap.id} className="bg-card border border-border rounded-md p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] capitalize">{swap.type}</Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {swap.status === "accepted" ? "Awaiting approval (swap)" : "Awaiting approval (drop)"}
                  </Badge>
                </div>
                <p className="text-sm font-medium mt-1">{shift.location.name} — <span className="font-mono text-teal-400">{timeRange}</span></p>
                <p className="text-xs text-muted-foreground capitalize">{shift.requiredSkill.name}</p>
              </div>
            </div>

            <div className="text-sm space-y-0.5">
              <p><span className="text-muted-foreground">From:</span> {swap.requester.name}</p>
              {swap.type === "swap" && swap.target && <p><span className="text-muted-foreground">To:</span> {swap.target.name}</p>}
              {swap.type === "drop" && swap.claimer && <p><span className="text-muted-foreground">Claimed by:</span> {swap.claimer.name}</p>}
            </div>

            {isRejecting ? (
              <div className="space-y-2">
                <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection (optional)" className="h-8 text-xs" />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs bg-destructive hover:bg-destructive/90 text-white"
                    onClick={() => { action.mutate({ id: swap.id, action: "reject", reason: rejectReason }); setRejectId(null); setRejectReason(""); }}>
                    Confirm Reject
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setRejectId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={action.isPending}
                  onClick={() => action.mutate({ id: swap.id, action: "approve" })}>
                  Approve
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => setRejectId(swap.id)}>
                  Reject
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
