"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatRangeForLocation, formatDateForLocation } from "@/lib/timezone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateSwap } from "@/hooks/mutations/useSwapMutations";

interface Assignment {
  id: string;
  shiftId: string;
  shift: {
    id: string;
    startUtc: string;
    endUtc: string;
    isPremium: boolean;
    isOvernight: boolean;
    status: string;
    location: { id: string; name: string; timezone: string };
    requiredSkill: { id: string; name: string };
  };
  swapRequests: { id: string; type: string; status: string }[];
}

interface StaffMember { id: string; name: string }

export function StaffScheduleClient({ initialAssignments, userId }: { initialAssignments: Assignment[]; userId: string }) {
  const { data: assignments = initialAssignments } = useQuery<Assignment[]>({
    queryKey: ["my-shifts", userId],
    queryFn: async () => {
      const res = await fetch("/api/my-shifts");
      if (!res.ok) throw new Error("Failed to load shifts");
      return res.json();
    },
    initialData: initialAssignments,
    staleTime: 30_000,
  });

  const [swapModal, setSwapModal] = useState<{ assignment: Assignment; type: "swap" | "drop" } | null>(null);
  const [targetUserId, setTargetUserId] = useState("");
  const createSwap = useCreateSwap();

  const { data: coworkers = [] } = useQuery<StaffMember[]>({
    queryKey: ["coworkers", swapModal?.assignment.shift.location.id],
    queryFn: async () => {
      if (!swapModal) return [];
      const res = await fetch(`/api/staff/coworkers?locationId=${swapModal.assignment.shift.location.id}&shiftId=${swapModal.assignment.shiftId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!swapModal && swapModal.type === "swap",
  });

  if (assignments.length === 0) {
    return <p className="text-sm text-muted-foreground">No upcoming shifts.</p>;
  }

  return (
    <>
      <div className="space-y-3">
        {assignments.map((a) => {
          const shift = a.shift;
          const timeRange = formatRangeForLocation(new Date(shift.startUtc), new Date(shift.endUtc), shift.location.timezone);
          const dateStr = formatDateForLocation(new Date(shift.startUtc), shift.location.timezone);
          const hasPending = a.swapRequests.length > 0;

          return (
            <div key={a.id} className="bg-card border border-border rounded-md p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{shift.location.name}</p>
                  <p className="text-xs text-muted-foreground">{dateStr}</p>
                  <p className="font-mono text-sm text-teal-400">{timeRange}</p>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] capitalize">{shift.requiredSkill.name}</Badge>
                    {shift.isPremium && <Badge className="text-[10px] bg-amber-800/60 text-amber-300 border-0">★ Premium</Badge>}
                    {shift.isOvernight && <Badge variant="outline" className="text-[10px]">Overnight</Badge>}
                    <Badge variant={shift.status === "published" ? "default" : "secondary"} className={shift.status === "published" ? "text-[10px] bg-teal-700 text-white border-0" : "text-[10px]"}>
                      {shift.status}
                    </Badge>
                  </div>
                </div>
                {!hasPending && shift.status === "published" && (
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => { setSwapModal({ assignment: a, type: "swap" }); setTargetUserId(""); }}>
                      Swap
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => setSwapModal({ assignment: a, type: "drop" })}>
                      Drop
                    </Button>
                  </div>
                )}
                {hasPending && (
                  <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-800/40 shrink-0">Pending {a.swapRequests[0].type}</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!swapModal} onOpenChange={(v) => !v && setSwapModal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{swapModal?.type === "drop" ? "Drop Shift" : "Request Swap"}</DialogTitle>
          </DialogHeader>
          {swapModal && (
            <div className="space-y-4">
              <div className="text-sm space-y-1 bg-muted/30 rounded-md p-3">
                <p className="font-medium">{swapModal.assignment.shift.location.name}</p>
                <p className="font-mono text-teal-400 text-xs">
                  {formatRangeForLocation(new Date(swapModal.assignment.shift.startUtc), new Date(swapModal.assignment.shift.endUtc), swapModal.assignment.shift.location.timezone)}
                </p>
              </div>

              {swapModal.type === "swap" && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Select staff to swap with:</p>
                  <Select onValueChange={(v) => setTargetUserId(v ?? "")} value={targetUserId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select staff member…" /></SelectTrigger>
                    <SelectContent>
                      {coworkers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {swapModal.type === "drop" && (
                <p className="text-sm text-muted-foreground">This shift will be available for qualified colleagues to claim, pending manager approval.</p>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setSwapModal(null)}>Cancel</Button>
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={createSwap.isPending || (swapModal.type === "swap" && !targetUserId)}
                  onClick={async () => {
                    await createSwap.mutateAsync({
                      assignmentId: swapModal.assignment.id,
                      type: swapModal.type,
                      targetUserId: swapModal.type === "swap" ? targetUserId : undefined,
                    });
                    setSwapModal(null);
                  }}>
                  {createSwap.isPending ? "Submitting…" : swapModal.type === "drop" ? "Submit Drop" : "Send Request"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
