import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StaffScheduleClient } from "./StaffScheduleClient";

export default async function StaffSchedulePage() {
  const user = await requireRole(["staff"]);

  const now = new Date();
  const assignments = await prisma.shiftAssignment.findMany({
    where: { userId: user.id, status: "active", shift: { startUtc: { gte: now } } },
    include: {
      shift: { include: { location: true, requiredSkill: true } },
      swapRequests: { where: { status: { in: ["pending", "accepted"] } } },
    },
    orderBy: { shift: { startUtc: "asc" } },
    take: 20,
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
    swapRequests: a.swapRequests.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      resolvedAt: s.resolvedAt?.toISOString() ?? null,
    })),
  }));

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-2">My Schedule</h1>
      <p className="text-sm text-muted-foreground mb-5">Upcoming shifts assigned to you.</p>
      <StaffScheduleClient initialAssignments={serialized as never} userId={user.id} />
    </div>
  );
}
