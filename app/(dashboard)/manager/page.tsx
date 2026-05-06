import { requireRole } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { ScheduleShell } from "@/components/schedule/schedule-shell";

interface PageProps {
  searchParams: Promise<{ week?: string; locationId?: string | string[] }>;
}

function getWeekStart(weekParam?: string): Date {
  if (weekParam) {
    const d = new Date(weekParam);
    if (!isNaN(d.getTime())) {
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
  }
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export default async function ManagerSchedulePage({ searchParams }: PageProps) {
  const user = await requireRole(["manager", "admin"]);
  const scope = await getUserScope(user.id);
  const params = await searchParams;

  const weekStart = getWeekStart(params.week);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

  // Locations this user can see
  const locations = await prisma.location.findMany({
    where: scope.role === "admin" ? { isActive: true } : {
      id: { in: scope.locationIds },
      isActive: true,
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, timezone: true },
  });

  const selectedIds = params.locationId
    ? (Array.isArray(params.locationId) ? params.locationId : [params.locationId])
    : [];

  const locationFilter = selectedIds.length > 0
    ? { locationId: { in: selectedIds } }
    : scope.role === "admin" ? {} : { locationId: { in: scope.locationIds } };

  const shifts = await prisma.shift.findMany({
    where: {
      ...locationFilter,
      startUtc: { gte: weekStart, lt: weekEnd },
    },
    include: {
      location: true,
      requiredSkill: true,
      assignments: {
        where: { status: "active" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
    orderBy: { startUtc: "asc" },
  });

  // Serialize dates for client
  const serializedShifts = shifts.map((s) => ({
    ...s,
    startUtc: s.startUtc.toISOString(),
    endUtc: s.endUtc.toISOString(),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    assignments: s.assignments.map((a) => ({
      ...a,
      assignedAt: a.assignedAt.toISOString(),
    })),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-foreground">Schedule</h1>
        <p className="text-xs text-muted-foreground">
          {scope.role === "admin" ? "All locations" : locations.map((l) => l.name).join(" · ")}
        </p>
      </div>

      <ScheduleShell
        weekStart={weekStart}
        locationIds={selectedIds}
        locations={locations}
        initialShifts={serializedShifts as never}
      />
    </div>
  );
}
