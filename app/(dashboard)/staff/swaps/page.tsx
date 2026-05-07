import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StaffSwapsClient } from "./StaffSwapsClient";

export default async function StaffSwapsPage() {
  const user = await requireRole(["staff"]);

  const swaps = await prisma.swapRequest.findMany({
    where: {
      OR: [{ requesterId: user.id }, { targetUserId: user.id }, { claimedBy: user.id }],
    },
    include: {
      requester: { select: { id: true, name: true } },
      target: { select: { id: true, name: true } },
      claimer: { select: { id: true, name: true } },
      shiftAssignment: { include: { shift: { include: { location: true, requiredSkill: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = swaps.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    resolvedAt: s.resolvedAt?.toISOString() ?? null,
    shiftAssignment: {
      ...s.shiftAssignment,
      assignedAt: s.shiftAssignment.assignedAt.toISOString(),
      shift: {
        ...s.shiftAssignment.shift,
        startUtc: s.shiftAssignment.shift.startUtc.toISOString(),
        endUtc: s.shiftAssignment.shift.endUtc.toISOString(),
        createdAt: s.shiftAssignment.shift.createdAt.toISOString(),
        updatedAt: s.shiftAssignment.shift.updatedAt.toISOString(),
      },
    },
  }));

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-5">My Swap & Drop Requests</h1>
      <StaffSwapsClient initialSwaps={serialized as never} userId={user.id} />
    </div>
  );
}
