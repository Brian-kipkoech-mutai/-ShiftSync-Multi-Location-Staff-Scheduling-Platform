"use client";

import { Suspense, useState } from "react";
import { useShifts, type ShiftWithRelations } from "@/hooks/queries/useShifts";
import { WeekGrid } from "./week-grid";
import { WeekNav } from "./week-nav";
import { LocationSelector } from "./location-selector";
import { ShiftDetailSheet } from "@/components/shifts/ShiftDetailSheet";
import { ShiftFormModal } from "@/components/shifts/ShiftFormModal";
import { Button } from "@/components/ui/button";
import { usePublishWeek, useUnpublishWeek } from "@/hooks/mutations/useShiftMutations";
import { Plus } from "lucide-react";

interface Location { id: string; name: string; timezone: string }
interface Skill { id: string; name: string }

interface ScheduleShellProps {
  weekStart: Date;
  locationIds: string[];
  locations: Location[];
  skills: Skill[];
  initialShifts: ShiftWithRelations[];
  canManage: boolean;
  weekStartISO: string;
}

export function ScheduleShell({
  weekStart,
  locationIds,
  locations,
  skills,
  initialShifts,
  canManage,
  weekStartISO,
}: ScheduleShellProps) {
  const { data: shifts = initialShifts, isFetching } = useShifts(weekStart, locationIds);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const selectedShift = selectedShiftId ? (shifts.find((s) => s.id === selectedShiftId) ?? null) : null;
  const [createOpen, setCreateOpen] = useState(false);
  const publishWeek = usePublishWeek();
  const unpublishWeek = useUnpublishWeek();

  const draftCount = shifts.filter((s) => s.status === "draft").length;
  const publishedCount = shifts.filter((s) => s.status === "published").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
        <Suspense fallback={null}>
          <WeekNav weekStart={weekStart} />
        </Suspense>
        <div className="flex items-center gap-2 flex-wrap">
          <Suspense fallback={null}>
            <LocationSelector locations={locations} selectedIds={locationIds} />
          </Suspense>
          {canManage && (
            <Button size="sm" className="h-8 bg-teal-600 hover:bg-teal-700 text-white gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              New Shift
            </Button>
          )}
        </div>
      </div>

      {/* Publish bar */}
      {canManage && (draftCount > 0 || publishedCount > 0) && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-card text-sm">
          <span className="text-muted-foreground flex-1">
            {draftCount > 0 && <span>{draftCount} draft{draftCount !== 1 ? "s" : ""}</span>}
            {draftCount > 0 && publishedCount > 0 && <span className="mx-1">·</span>}
            {publishedCount > 0 && <span>{publishedCount} published</span>}
          </span>
          {draftCount > 0 && (
            <Button size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white"
              disabled={publishWeek.isPending}
              onClick={() => publishWeek.mutate(weekStartISO)}>
              Publish Week
            </Button>
          )}
          {publishedCount > 0 && draftCount === 0 && (
            <Button size="sm" variant="outline" className="h-7 text-xs"
              disabled={unpublishWeek.isPending}
              onClick={() => unpublishWeek.mutate(weekStartISO)}>
              Unpublish
            </Button>
          )}
        </div>
      )}

      <div className={isFetching ? "opacity-60 transition-opacity" : ""}>
        <WeekGrid
          weekStart={weekStart}
          shifts={shifts}
          onShiftClick={(s) => setSelectedShiftId(s.id)}
        />
      </div>

      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm border border-dashed border-border inline-block" />
          Draft
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm border border-teal-800/60 bg-teal-950/30 inline-block" />
          Published
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm border border-amber-800/60 bg-amber-950/30 inline-block" />
          Premium
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm border border-red-800/60 bg-red-950/30 inline-block" />
          Under-staffed
        </span>
      </div>

      <ShiftDetailSheet
        shift={selectedShift}
        onClose={() => setSelectedShiftId(null)}
        locations={locations}
        skills={skills}
        canManage={canManage}
      />
      {canManage && (
        <ShiftFormModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          locations={locations}
          skills={skills}
        />
      )}
    </div>
  );
}
