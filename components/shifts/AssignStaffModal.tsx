"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useEligibleStaff } from "@/hooks/queries/useEligibleStaff";
import { useAssignStaff, useUnassignStaff } from "@/hooks/mutations/useAssignmentMutations";
import type { ShiftWithRelations } from "@/hooks/queries/useShifts";
import { formatRangeForLocation } from "@/lib/timezone";

interface Props {
  open: boolean;
  onClose: () => void;
  shift: ShiftWithRelations;
}

export function AssignStaffModal({ open, onClose, shift }: Props) {
  const [overrideUserId, setOverrideUserId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const { data: eligible = [], isLoading } = useEligibleStaff(shift.id, open);
  const assignStaff = useAssignStaff(shift.id);
  const unassignStaff = useUnassignStaff(shift.id);

  const timeRange = formatRangeForLocation(new Date(shift.startUtc), new Date(shift.endUtc), shift.location.timezone);

  async function handleAssign(userId: string, needsOverride: boolean) {
    if (needsOverride) {
      if (!overrideReason.trim()) { setOverrideUserId(userId); return; }
      await assignStaff.mutateAsync({ userId, overrideReason });
      setOverrideUserId(null);
      setOverrideReason("");
    } else {
      await assignStaff.mutateAsync({ userId });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Assign Staff — <span className="font-mono text-teal-400">{timeRange}</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{shift.location.name} · {shift.requiredSkill.name} · {shift.assignments.length}/{shift.headcount} assigned</p>
        </DialogHeader>

        {/* Currently assigned */}
        {shift.assignments.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Assigned</p>
            {shift.assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between bg-teal-950/30 border border-teal-800/40 rounded-md px-3 py-1.5">
                <span className="text-sm">{a.user.name}</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => unassignStaff.mutate(a.id)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Eligible staff */}
        <div className="flex-1 overflow-y-auto space-y-1.5 mt-2">
          {isLoading && <p className="text-sm text-muted-foreground text-center py-4">Loading staff…</p>}
          {!isLoading && eligible.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No eligible staff found</p>
          )}
          {eligible.map((s) => {
            const isOverriding = overrideUserId === s.id;
            const warnings = s.violations.filter((v) => v.severity === "warning");
            const overrides = s.violations.filter((v) => v.severity === "override");

            return (
              <div key={s.id} className={cn("rounded-md border p-3 text-sm", s.canAssign || s.needsOverride ? "border-border" : "border-border opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.weeklyHours}h this week · {s.homeLocation}</p>
                    <p className="text-xs text-muted-foreground capitalize">{s.skills.join(", ")}</p>
                  </div>
                  <div className="shrink-0">
                    {!s.canAssign && !s.needsOverride ? (
                      <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40">Blocked</Badge>
                    ) : (
                      <Button size="sm" className={cn("h-7 text-xs", s.needsOverride ? "bg-amber-700 hover:bg-amber-800 text-white" : "bg-teal-600 hover:bg-teal-700 text-white")}
                        disabled={assignStaff.isPending}
                        onClick={() => handleAssign(s.id, s.needsOverride)}>
                        {s.needsOverride ? "Override" : "Assign"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Violations */}
                {overrides.map((v) => (
                  <p key={v.rule} className="text-[11px] text-amber-400 mt-1">⚠ {v.message}</p>
                ))}
                {warnings.map((v) => (
                  <p key={v.rule} className="text-[11px] text-yellow-500/80 mt-1">• {v.message}</p>
                ))}
                {!s.canAssign && !s.needsOverride && s.violations.filter(v => v.severity === "block").map((v) => (
                  <p key={v.rule} className="text-[11px] text-destructive/80 mt-1">✕ {v.message}</p>
                ))}

                {/* Override reason input */}
                {isOverriding && (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-xs text-amber-400">Override reason required:</p>
                    <Input
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Enter reason for override…"
                      className="h-8 text-xs"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs bg-amber-700 hover:bg-amber-800 text-white"
                        disabled={!overrideReason.trim() || assignStaff.isPending}
                        onClick={() => handleAssign(s.id, true)}>
                        Confirm Override
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => { setOverrideUserId(null); setOverrideReason(""); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
