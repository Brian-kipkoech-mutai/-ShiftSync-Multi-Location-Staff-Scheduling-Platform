"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRangeForLocation, formatDateForLocation } from "@/lib/timezone";
import { useDeleteShift } from "@/hooks/mutations/useShiftMutations";
import { ShiftFormModal } from "./ShiftFormModal";
import { AssignStaffModal } from "./AssignStaffModal";
import type { ShiftWithRelations } from "@/hooks/queries/useShifts";

interface Location { id: string; name: string; timezone: string }
interface Skill { id: string; name: string }

interface Props {
  shift: ShiftWithRelations | null;
  onClose: () => void;
  locations: Location[];
  skills: Skill[];
  canManage: boolean;
}

export function ShiftDetailSheet({ shift, onClose, locations, skills, canManage }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const deleteShift = useDeleteShift();

  if (!shift) return null;

  const timeRange = formatRangeForLocation(new Date(shift.startUtc), new Date(shift.endUtc), shift.location.timezone);
  const dateStr = formatDateForLocation(new Date(shift.startUtc), shift.location.timezone);
  const isFull = shift.assignments.length >= shift.headcount;
  const isDraft = shift.status === "draft";
  const isUnder = shift.status === "published" && shift.assignments.length < shift.headcount;

  async function handleDelete() {
    if (!confirm("Delete this draft shift?")) return;
    await deleteShift.mutateAsync(shift!.id);
    onClose();
  }

  return (
    <>
      <Sheet open={!!shift} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="w-80 sm:w-96 flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle className="text-base">Shift Details</SheetTitle>
          </SheetHeader>

          {/* Status badges */}
          <div className="flex gap-1.5 flex-wrap">
            <Badge variant={isDraft ? "secondary" : "default"} className={isDraft ? "" : "bg-teal-700 text-white border-0"}>
              {shift.status}
            </Badge>
            {shift.isPremium && <Badge className="bg-amber-800/60 text-amber-300 border-0 text-[10px]">★ Premium</Badge>}
            {shift.isOvernight && <Badge variant="outline" className="text-[10px]">Overnight</Badge>}
            {isUnder && <Badge className="bg-red-900/60 text-red-300 border-0 text-[10px]">Under-staffed</Badge>}
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="font-medium">{shift.location.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium">{dateStr}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Time</p>
              <p className="font-mono">{timeRange}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Required Skill</p>
              <p className="capitalize">{shift.requiredSkill.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Headcount</p>
              <p className={isFull ? "text-teal-400" : isUnder ? "text-red-400" : ""}>
                {shift.assignments.length} / {shift.headcount}
              </p>
            </div>
          </div>

          {/* Assigned staff */}
          {shift.assignments.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Assigned Staff</p>
              <div className="space-y-1">
                {shift.assignments.map((a) => (
                  <div key={a.id} className="text-sm bg-card border border-border rounded-md px-2.5 py-1.5">
                    {a.user.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manager actions */}
          {canManage && (
            <div className="space-y-2 mt-auto">
              {!isFull && (
                <Button size="sm" className="w-full bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAssignOpen(true)}>
                  Assign Staff ({shift.assignments.length}/{shift.headcount})
                </Button>
              )}
              <Button size="sm" variant="outline" className="w-full" onClick={() => setEditOpen(true)}>
                Edit Shift
              </Button>
              {isDraft && (
                <Button size="sm" variant="outline" className="w-full text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={handleDelete} disabled={deleteShift.isPending}>
                  Delete Draft
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ShiftFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        shift={shift}
        locations={locations}
        skills={skills}
      />
      {assignOpen && (
        <AssignStaffModal
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          shift={shift}
        />
      )}
    </>
  );
}
