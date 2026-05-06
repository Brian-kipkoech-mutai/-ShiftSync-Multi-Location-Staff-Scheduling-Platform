import { cn } from "@/lib/utils";
import { formatRangeForLocation } from "@/lib/timezone";
import { Badge } from "@/components/ui/badge";
import type { ShiftWithRelations } from "@/hooks/queries/useShifts";

interface ShiftCardProps {
  shift: ShiftWithRelations;
  onClick?: (shift: ShiftWithRelations) => void;
}

export function ShiftCard({ shift, onClick }: ShiftCardProps) {
  const isDraft = shift.status === "draft";
  const assignedCount = shift.assignments.length;
  const isFull = assignedCount >= shift.headcount;
  const isUnder = shift.status === "published" && assignedCount < shift.headcount;

  const timeRange = formatRangeForLocation(
    new Date(shift.startUtc),
    new Date(shift.endUtc),
    shift.location.timezone
  );

  return (
    <div
      onClick={() => onClick?.(shift)}
      className={cn(
        "rounded-md px-2 py-1.5 cursor-pointer transition-colors group",
        "max-h-20 overflow-hidden",
        isDraft
          ? "border border-dashed border-slate-300 bg-white hover:border-slate-400"
          : "border border-teal-200 bg-teal-50 hover:border-teal-400",
        isUnder && "border-red-300 bg-red-50 hover:border-red-400",
        shift.isPremium && !isDraft && "border-amber-300 bg-amber-50 hover:border-amber-400"
      )}
    >
      <div className="flex items-start justify-between gap-1 min-w-0">
        <p className="font-mono text-[11px] leading-tight text-slate-700 truncate flex-1">
          {timeRange}
        </p>
        <span
          className={cn(
            "text-[10px] shrink-0 font-medium tabular-nums",
            isFull ? "text-teal-600" : isUnder ? "text-red-500" : "text-slate-400"
          )}
        >
          {assignedCount}/{shift.headcount}
        </span>
      </div>

      <div className="flex items-center gap-1 mt-0.5 min-w-0">
        <p className="text-[11px] text-slate-500 truncate">{shift.location.name}</p>
        {shift.isPremium && (
          <span className="text-[9px] text-amber-600 font-medium shrink-0">★</span>
        )}
      </div>

      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
        <Badge
          variant="secondary"
          className="h-4 px-1 text-[10px] rounded-sm font-normal capitalize"
        >
          {shift.requiredSkill.name}
        </Badge>
        {isDraft && (
          <Badge
            variant="outline"
            className="h-4 px-1 text-[10px] rounded-sm font-normal text-slate-400 border-slate-200"
          >
            draft
          </Badge>
        )}
      </div>

      {shift.assignments.length > 0 && (
        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
          {shift.assignments.map((a) => a.user.name.split(" ")[0]).join(", ")}
        </p>
      )}
    </div>
  );
}
