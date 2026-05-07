import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserScope } from "@/lib/scope";
import { OvertimeClient } from "./OvertimeClient";
import { startOfWeek, endOfWeek } from "date-fns";

export default async function OvertimePage() {
  const user = await requireRole(["manager", "admin"]);
  const scope = await getUserScope(user.id);
  const locationIds = scope.role === "admin" ? undefined : scope.locationIds;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      status: "active",
      shift: {
        startUtc: { gte: weekStart, lte: weekEnd },
        status: "published",
        ...(locationIds ? { locationId: { in: locationIds } } : {}),
      },
    },
    include: {
      user: { select: { id: true, name: true, desiredHours: true } },
      shift: { select: { startUtc: true, endUtc: true, location: { select: { id: true, name: true } } } },
    },
  });

  // Aggregate hours per user
  const userMap = new Map<string, {
    userId: string;
    name: string;
    hours: number;
    desiredHours: number | null;
    shiftCount: number;
  }>();

  for (const a of assignments) {
    const hours = (new Date(a.shift.endUtc).getTime() - new Date(a.shift.startUtc).getTime()) / 3600000;
    const existing = userMap.get(a.userId);
    if (existing) {
      existing.hours += hours;
      existing.shiftCount++;
    } else {
      userMap.set(a.userId, {
        userId: a.userId,
        name: a.user.name,
        hours,
        desiredHours: a.user.desiredHours?.hoursPerWeek ?? null,
        shiftCount: 1,
      });
    }
  }

  const staff = Array.from(userMap.values()).sort((a, b) => b.hours - a.hours);

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-1">Weekly Hours Tracker</h1>
      <p className="text-sm text-muted-foreground mb-5">
        Week of {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>
      <OvertimeClient staff={staff} weekStartISO={weekStart.toISOString()} />
    </div>
  );
}
