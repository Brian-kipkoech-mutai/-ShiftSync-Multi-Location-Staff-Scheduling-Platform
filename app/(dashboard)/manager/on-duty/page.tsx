import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserScope, buildLocationFilter } from "@/lib/scope";
import { OnDutyClient } from "./OnDutyClient";

export default async function ManagerOnDutyPage() {
  const user = await requireRole(["manager", "admin"]);
  const scope = await getUserScope(user.id);
  const locationFilter = buildLocationFilter(scope);
  const now = new Date();

  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      status: "active",
      shift: {
        ...locationFilter,
        status: "published",
        startUtc: { lte: now },
        endUtc: { gte: now },
      },
    },
    include: {
      user: { select: { id: true, name: true } },
      shift: { include: { location: true, requiredSkill: true } },
    },
    orderBy: { shift: { location: { name: "asc" } } },
  });

  const serialized = assignments.map((a) => ({
    ...a,
    assignedAt: a.assignedAt.toISOString(),
    shift: {
      ...a.shift,
      startUtc: a.shift.startUtc.toISOString(),
      endUtc: a.shift.endUtc.toISOString(),
      createdAt: a.shift.createdAt.toISOString(),
      updatedAt: a.shift.updatedAt.toISOString(),
    },
  }));

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-1">On-Duty Now</h1>
      <p className="text-sm text-muted-foreground mb-5">Staff currently working across your locations</p>
      <OnDutyClient initialAssignments={serialized as never} />
    </div>
  );
}
