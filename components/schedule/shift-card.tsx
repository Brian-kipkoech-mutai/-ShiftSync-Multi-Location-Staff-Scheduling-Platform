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
        isDraft
          ? "border border-dashed border-border bg-card hover:border-muted-foreground/40"
          : "border border-teal-800/60 bg-teal-950/30 hover:border-teal-700",
        isUnder && "border-red-800/60 bg-red-950/30 hover:border-red-700",
        shift.isPremium && !isDraft && "border-amber-800/60 bg-amber-950/30 hover:border-amber-700"
      )}
    >
      {/* Time + headcount */}
      <div className="flex items-start justify-between gap-1 min-w-0">
        <p className="font-mono text-[11px] leading-tight text-foreground truncate flex-1">
          {timeRange}
        </p>
        <span
          className={cn(
            "text-[10px] shrink-0 font-medium tabular-nums",
            isFull ? "text-teal-400" : isUnder ? "text-red-400" : "text-muted-foreground"
          )}
        >
          {assignedCount}/{shift.headcount}
        </span>
      </div>

      {/* Location */}
      <div className="flex items-center gap-1 mt-0.5 min-w-0">
        <p className="text-[11px] text-muted-foreground truncate">{shift.location.name}</p>
        {shift.isPremium && (
          <span className="text-[9px] text-amber-400 font-medium shrink-0">★</span>
        )}
      </div>

      {/* Skill + draft badge */}
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
            className="h-4 px-1 text-[10px] rounded-sm font-normal text-muted-foreground border-border"
          >
            draft
          </Badge>
        )}
      </div>

      {/* Assigned staff — show all names on lg, first names on sm */}
      {shift.assignments.length > 0 && (
        <p className="text-[10px] text-muted-foreground/70 mt-1 leading-tight">
          <span className="lg:hidden">
            {shift.assignments.map((a) => a.user.name.split(" ")[0]).join(", ")}
          </span>
          <span className="hidden lg:block">
            {shift.assignments.map((a) => a.user.name).join(", ")}
          </span>
        </p>
      )}
    </div>
  );
}
