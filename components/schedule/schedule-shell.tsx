"use client";

import { Suspense } from "react";
import { useShifts, type ShiftWithRelations } from "@/hooks/queries/useShifts";
import { WeekGrid } from "./week-grid";
import { WeekNav } from "./week-nav";
import { LocationSelector } from "./location-selector";

interface Location {
  id: string;
  name: string;
  timezone: string;
}

interface ScheduleShellProps {
  weekStart: Date;
  locationIds: string[];
  locations: Location[];
  initialShifts: ShiftWithRelations[];
  onShiftClick?: (shift: ShiftWithRelations) => void;
}

export function ScheduleShell({
  weekStart,
  locationIds,
  locations,
  initialShifts,
  onShiftClick,
}: ScheduleShellProps) {
  const { data: shifts = initialShifts, isFetching } = useShifts(
    weekStart,
    locationIds
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
        <Suspense fallback={null}>
          <WeekNav weekStart={weekStart} />
        </Suspense>
        <Suspense fallback={null}>
          <LocationSelector locations={locations} selectedIds={locationIds} />
        </Suspense>
      </div>

      <div className={isFetching ? "opacity-60 transition-opacity" : ""}>
        <WeekGrid
          weekStart={weekStart}
          shifts={shifts}
          onShiftClick={onShiftClick}
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
          Premium (Fri/Sat eve)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm border border-red-800/60 bg-red-950/30 inline-block" />
          Under-staffed
        </span>
      </div>
    </div>
  );
}
