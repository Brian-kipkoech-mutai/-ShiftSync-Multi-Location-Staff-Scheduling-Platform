import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnDutyClient } from "@/app/(dashboard)/manager/on-duty/OnDutyClient";

export default async function AdminOnDutyPage() {
  await requireRole(["admin"]);
  const now = new Date();

  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      status: "active",
      shift: {
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
      <p className="text-sm text-muted-foreground mb-5">All staff currently working across all locations</p>
      <OnDutyClient initialAssignments={serialized as never} />
    </div>
  );
}
