"use client";

import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

interface WeekNavProps {
  weekStart: Date;
}

export function WeekNav({ weekStart }: WeekNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(newWeekStart: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("week", newWeekStart.toISOString().split("T")[0]);
    router.push(`${pathname}?${params.toString()}`);
  }

  function goToPrev() {
    navigate(addDays(weekStart, -7));
  }

  function goToNext() {
    navigate(addDays(weekStart, 7));
  }

  function goToToday() {
    const today = new Date();
    const day = today.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setUTCDate(today.getUTCDate() + diff);
    monday.setUTCHours(0, 0, 0, 0);
    navigate(monday);
  }

  const weekEnd = addDays(weekStart, 6);
  const weekLabel =
    format(weekStart, "MMM d") + " – " + format(weekEnd, "MMM d, yyyy");

  const isCurrentWeek = isSameDay(
    weekStart,
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={goToPrev}
        className="h-8 w-8 p-0 rounded-sm"
      >
        ‹
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={goToNext}
        className="h-8 w-8 p-0 rounded-sm"
      >
        ›
      </Button>
      <span className="text-sm font-medium text-slate-700 min-w-44">
        {weekLabel}
      </span>
      {!isCurrentWeek && (
        <Button
          variant="ghost"
          size="sm"
          onClick={goToToday}
          className="h-8 text-xs text-[#0F6E56] hover:text-[#0a5642] rounded-sm"
        >
          Today
        </Button>
      )}
    </div>
  );
}
