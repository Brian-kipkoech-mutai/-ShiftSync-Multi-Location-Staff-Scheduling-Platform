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
      <div className="flex items-center justify-between flex-wrap gap-3">
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

      <div className="flex items-center gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm border border-dashed border-slate-300 inline-block" />
          Draft
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm border border-teal-200 bg-teal-50 inline-block" />
          Published
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm border border-amber-300 bg-amber-50 inline-block" />
          Premium (Fri/Sat eve)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm border border-red-300 bg-red-50 inline-block" />
          Under-staffed
        </span>
      </div>
    </div>
  );
}
