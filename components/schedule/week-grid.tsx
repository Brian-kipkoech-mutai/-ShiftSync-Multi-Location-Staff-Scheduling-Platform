"use client";

import { useMemo } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ShiftCard } from "./shift-card";
import type { ShiftWithRelations } from "@/hooks/queries/useShifts";

interface WeekGridProps {
  weekStart: Date;
  shifts: ShiftWithRelations[];
  onShiftClick?: (shift: ShiftWithRelations) => void;
  isLoading?: boolean;
}

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_FULL  = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function WeekGrid({ weekStart, shifts, onShiftClick, isLoading = false }: WeekGridProps) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const shiftsByDay = useMemo(() => {
    const map = new Map<number, ShiftWithRelations[]>();
    for (let i = 0; i < 7; i++) map.set(i, []);

    for (const shift of shifts) {
      const shiftDate = new Date(shift.startUtc);
      const localDate = toZonedTime(shiftDate, shift.location.timezone);

      for (let i = 0; i < 7; i++) {
        if (isSameDay(localDate, days[i])) {
          map.get(i)!.push(shift);
          break;
        }
      }
    }
    return map;
  }, [shifts, days]);

  const today = new Date();

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden border border-border min-w-140">
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          const dayShifts = shiftsByDay.get(i) ?? [];

          return (
            <div key={i} className="bg-card flex flex-col min-h-32 lg:min-h-130">
              {/* Column header */}
              <div
                className={`flex flex-col items-center justify-center border-b border-border shrink-0 py-2 lg:py-3 ${
                  isToday ? "bg-teal-950/40" : ""
                }`}
              >
                {/* Short label on sm, full name on lg */}
                <span
                  className={`text-[11px] font-medium uppercase tracking-wide lg:hidden ${
                    isToday ? "text-teal-400" : "text-muted-foreground"
                  }`}
                >
                  {DAYS_SHORT[i]}
                </span>
                <span
                  className={`hidden lg:block text-xs font-medium ${
                    isToday ? "text-teal-400" : "text-muted-foreground"
                  }`}
                >
                  {DAYS_FULL[i]}
                </span>
                <span
                  className={`text-sm font-semibold leading-tight lg:text-base ${
                    isToday ? "text-teal-300" : "text-foreground"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Shift cards */}
              <div className="flex-1 p-1 space-y-1 overflow-y-auto">
                {isLoading ? (
                  <ShiftCardSkeleton count={i % 3 === 0 ? 2 : i % 3 === 1 ? 1 : 2} />
                ) : dayShifts.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/40 text-center mt-4">—</p>
                ) : (
                  dayShifts.map((shift) => (
                    <ShiftCard
                      key={shift.id}
                      shift={shift}
                      onClick={onShiftClick}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShiftCardSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-md border border-border bg-card px-2 py-1.5 animate-pulse space-y-1.5">
          <div className="flex justify-between gap-1">
            <div className="h-2.5 bg-muted rounded w-3/4" />
            <div className="h-2.5 bg-muted rounded w-6" />
          </div>
          <div className="h-2 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-14" />
          <div className="h-2 bg-muted rounded w-2/3" />
        </div>
      ))}
    </>
  );
}
