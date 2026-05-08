"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

const LEGEND = [
  { label: "Draft",        borderClass: "border-dashed border-border", bgClass: "" },
  { label: "Published",    borderClass: "border-teal-800/60",          bgClass: "bg-teal-950/30" },
  { label: "Premium",      borderClass: "border-amber-800/60",         bgClass: "bg-amber-950/30" },
  { label: "Under-staffed",borderClass: "border-red-800/60",           bgClass: "bg-red-950/30" },
];

export function ScheduleShell({
  weekStart,
  locationIds,
  locations,
  skills,
  initialShifts,
  canManage,
  weekStartISO,
}: ScheduleShellProps) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();

  function navigateToWeek(date: Date) {
    const params = new URLSearchParams();
    params.set("week", date.toISOString().split("T")[0]);
    locationIds.forEach((id) => params.append("locationId", id));
    startTransition(() => router.push(`?${params.toString()}`));
  }

  const isInitialWeek = weekStartISO === weekStart.toISOString().split("T")[0];
  const { data: shifts = [], isFetching } = useShifts(
    weekStart,
    locationIds,
    isInitialWeek ? initialShifts : undefined,
  );
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const selectedShift = selectedShiftId ? (shifts.find((s) => s.id === selectedShiftId) ?? null) : null;
  const [createOpen, setCreateOpen] = useState(false);
  const publishWeek = usePublishWeek();
  const unpublishWeek = useUnpublishWeek();

  const draftCount = shifts.filter((s) => s.status === "draft").length;
  const publishedCount = shifts.filter((s) => s.status === "published").length;

  return (
    <div className="space-y-3">
      {/* Toolbar — stacks on sm, single row on lg */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: week nav */}
        <WeekNav weekStart={weekStart} onNavigate={navigateToWeek} />

        {/* Right: location selector + action + legend */}
        <div className="flex items-center gap-2 flex-wrap lg:gap-3">
          {/* Legend — hidden on sm, inline on lg */}
          <div className="hidden lg:flex items-center gap-3 mr-1">
            {LEGEND.map(({ label, borderClass, bgClass }) => (
              <span key={label} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className={`w-3 h-3 rounded-sm border ${borderClass} ${bgClass} inline-block`} />
                {label}
              </span>
            ))}
          </div>

          <Suspense fallback={null}>
            <LocationSelector locations={locations} selectedIds={locationIds} />
          </Suspense>

          {canManage && (
            <Button
              size="sm"
              className="h-8 bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              New Shift
            </Button>
          )}
        </div>
      </div>

      {/* Publish bar */}
      {canManage && (draftCount > 0 || publishedCount > 0) && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-card text-sm">
          <span className="text-muted-foreground flex-1 text-xs">
            {draftCount > 0 && <span>{draftCount} draft{draftCount !== 1 ? "s" : ""}</span>}
            {draftCount > 0 && publishedCount > 0 && <span className="mx-1.5 text-border">·</span>}
            {publishedCount > 0 && <span>{publishedCount} published</span>}
          </span>
          {draftCount > 0 && (
            <Button
              size="sm"
              className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white"
              disabled={publishWeek.isPending}
              onClick={() => publishWeek.mutate(weekStartISO)}
            >
              Publish Week
            </Button>
          )}
          {publishedCount > 0 && draftCount === 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={unpublishWeek.isPending}
              onClick={() => unpublishWeek.mutate(weekStartISO)}
            >
              Unpublish
            </Button>
          )}
        </div>
      )}

      {/* Grid */}
      <div className={isFetching && !isNavigating ? "opacity-60 transition-opacity" : ""}>
        <WeekGrid
          weekStart={weekStart}
          shifts={shifts}
          onShiftClick={(s) => setSelectedShiftId(s.id)}
          isLoading={isNavigating}
        />
      </div>

      {/* Legend — visible only on sm (lg version is inline in toolbar) */}
      <div className="flex items-center gap-4 lg:hidden">
        {LEGEND.map(({ label, borderClass, bgClass }) => (
          <span key={label} className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className={`w-3 h-3 rounded-sm border ${borderClass} ${bgClass} inline-block`} />
            {label}
          </span>
        ))}
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
