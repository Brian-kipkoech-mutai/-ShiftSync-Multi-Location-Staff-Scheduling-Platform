import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AvailableDropsClient } from "./AvailableDropsClient";
import type { SwapRequest } from "@/hooks/queries/useSwapRequests";

export default async function AvailableDropsPage() {
  const user = await requireRole(["staff"]);
  const now = new Date();
  const cutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const certs = await prisma.locationCertification.findMany({
    where: { userId: user.id, revokedAt: null },
    select: { locationId: true },
  });
  const skills = await prisma.userSkill.findMany({
    where: { userId: user.id },
    select: { skillId: true },
  });

  const drops = await prisma.swapRequest.findMany({
    where: {
      type: "drop",
      status: "pending",
      requesterId: { not: user.id },
      shiftAssignment: {
        shift: {
          startUtc: { gt: cutoff },
          locationId: { in: certs.map((c) => c.locationId) },
          requiredSkillId: { in: skills.map((s) => s.skillId) },
        },
      },
    },
    include: {
      requester: { select: { id: true, name: true } },
      shiftAssignment: {
        include: { shift: { include: { location: true, requiredSkill: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const serialized = drops.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
    resolvedAt: d.resolvedAt?.toISOString() ?? null,
    shiftAssignment: {
      ...d.shiftAssignment,
      assignedAt: d.shiftAssignment.assignedAt.toISOString(),
      shift: {
        ...d.shiftAssignment.shift,
        startUtc: d.shiftAssignment.shift.startUtc.toISOString(),
        endUtc: d.shiftAssignment.shift.endUtc.toISOString(),
        createdAt: d.shiftAssignment.shift.createdAt.toISOString(),
        updatedAt: d.shiftAssignment.shift.updatedAt.toISOString(),
      },
    },
  }));

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-5">Available Shifts to Pick Up</h1>
      <AvailableDropsClient initialDrops={serialized as never} />
    </div>
  );
}
