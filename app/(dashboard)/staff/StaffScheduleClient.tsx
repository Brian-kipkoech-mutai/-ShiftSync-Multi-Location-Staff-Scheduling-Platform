"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatRangeForLocation, formatDateForLocation } from "@/lib/timezone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin, CalendarDays, ArrowLeftRight } from "lucide-react";
import { useCreateSwap } from "@/hooks/mutations/useSwapMutations";
import { cn } from "@/lib/utils";

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

  const { data: coworkers = [], isLoading: coworkersLoading } = useQuery<StaffMember[]>({
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
    return (
      <div className="flex flex-col items-center justify-center min-h-48 border border-border rounded-md p-8 text-center">
        <CalendarDays className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium">No upcoming shifts</p>
        <p className="text-xs text-muted-foreground mt-1">You have no shifts scheduled yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assignments.map((a) => {
          const shift = a.shift;
          const timeRange = formatRangeForLocation(new Date(shift.startUtc), new Date(shift.endUtc), shift.location.timezone);
          const dateStr = formatDateForLocation(new Date(shift.startUtc), shift.location.timezone);
          const hasPending = a.swapRequests.length > 0;
          const isPublished = shift.status === "published";

          return (
            <div
              key={a.id}
              className={cn(
                "bg-card border rounded-md flex flex-col",
                shift.isPremium && isPublished ? "border-amber-800/50" : "border-border"
              )}
            >
              {/* Card header */}
              <div className="px-4 pt-4 pb-3 border-b border-border space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                    <p className="text-sm font-semibold truncate">{shift.location.name}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] shrink-0",
                      isPublished ? "text-teal-400 border-teal-700/50" : "text-muted-foreground"
                    )}
                  >
                    {shift.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  {dateStr}
                </div>
              </div>

              {/* Card body */}
              <div className="px-4 py-3 flex-1 space-y-3">
                <p className="font-mono text-lg text-teal-400 leading-tight">{timeRange}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[10px] capitalize">{shift.requiredSkill.name}</Badge>
                  {shift.isPremium && <Badge className="text-[10px] bg-amber-800/60 text-amber-300 border-0">★ Premium</Badge>}
                  {shift.isOvernight && <Badge variant="outline" className="text-[10px]">Overnight</Badge>}
                </div>
              </div>

              {/* Card footer */}
              <div className="px-4 py-2.5 border-t border-border flex items-center justify-end gap-1.5">
                {hasPending ? (
                  <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-800/40">
                    Pending {a.swapRequests[0].type}
                  </Badge>
                ) : isPublished ? (
                  <>
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => { setSwapModal({ assignment: a, type: "swap" }); setTargetUserId(""); }}>
                      <ArrowLeftRight className="h-3 w-3 mr-1" />Swap
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => setSwapModal({ assignment: a, type: "drop" })}>
                      Drop
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Not yet published</span>
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
                  <Select onValueChange={(v) => setTargetUserId(typeof v === "string" ? v : "")} value={targetUserId}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Select staff member…" />
                    </SelectTrigger>
                    <SelectContent>
                      {coworkersLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : coworkers.length === 0 ? (
                        <div className="py-3 px-2 text-xs text-muted-foreground text-center">No eligible staff available</div>
                      ) : (
                        coworkers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                      )}
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
