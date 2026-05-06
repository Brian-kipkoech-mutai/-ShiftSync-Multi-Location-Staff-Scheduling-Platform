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
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekGrid({ weekStart, shifts, onShiftClick }: WeekGridProps) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const shiftsByDay = useMemo(() => {
    const map = new Map<number, ShiftWithRelations[]>();
    for (let i = 0; i < 7; i++) map.set(i, []);

    for (const shift of shifts) {
      const shiftDate = new Date(shift.startUtc);
      // Bucket by location's timezone calendar day
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
    <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-md overflow-hidden border border-slate-200">
      {days.map((day, i) => {
        const isToday = isSameDay(day, today);
        const dayShifts = shiftsByDay.get(i) ?? [];

        return (
          <div key={i} className="bg-white flex flex-col min-h-32">
            {/* Column header */}
            <div
              className={`h-10 flex flex-col items-center justify-center border-b border-slate-100 shrink-0 ${
                isToday ? "bg-teal-50" : ""
              }`}
            >
              <span
                className={`text-[11px] font-medium uppercase tracking-wide ${
                  isToday ? "text-[#0F6E56]" : "text-slate-400"
                }`}
              >
                {DAYS[i]}
              </span>
              <span
                className={`text-sm font-semibold leading-tight ${
                  isToday ? "text-[#0F6E56]" : "text-slate-700"
                }`}
              >
                {format(day, "d")}
              </span>
            </div>

            {/* Shifts */}
            <div className="flex-1 p-1 space-y-1 overflow-y-auto">
              {dayShifts.length === 0 ? (
                <p className="text-[11px] text-slate-300 text-center mt-3">—</p>
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
  );
}
