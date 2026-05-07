import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ScheduleShell } from "@/components/schedule/schedule-shell";

interface PageProps {
  searchParams: Promise<{ week?: string; locationId?: string | string[] }>;
}

function getWeekStart(weekParam?: string): Date {
  if (weekParam) {
    const d = new Date(weekParam);
    if (!isNaN(d.getTime())) { d.setUTCHours(0, 0, 0, 0); return d; }
  }
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

export default async function AdminSchedulePage({ searchParams }: PageProps) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const weekStart = getWeekStart(params.week);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

  const [locations, skills] = await Promise.all([
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, timezone: true } }),
    prisma.skill.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const selectedIds = params.locationId
    ? (Array.isArray(params.locationId) ? params.locationId : [params.locationId])
    : [];

  const shifts = await prisma.shift.findMany({
    where: {
      ...(selectedIds.length > 0 ? { locationId: { in: selectedIds } } : {}),
      startUtc: { gte: weekStart, lt: weekEnd },
    },
    include: {
      location: true,
      requiredSkill: true,
      assignments: { where: { status: "active" }, include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { startUtc: "asc" },
  });

  const serialized = shifts.map((s) => ({
    ...s,
    startUtc: s.startUtc.toISOString(),
    endUtc: s.endUtc.toISOString(),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    assignments: s.assignments.map((a) => ({ ...a, assignedAt: a.assignedAt.toISOString() })),
  }));

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-5">Schedule — All Locations</h1>
      <ScheduleShell
        weekStart={weekStart}
        weekStartISO={weekStart.toISOString()}
        locationIds={selectedIds}
        locations={locations}
        skills={skills}
        initialShifts={serialized as never}
        canManage={true}
      />
    </div>
  );
}
