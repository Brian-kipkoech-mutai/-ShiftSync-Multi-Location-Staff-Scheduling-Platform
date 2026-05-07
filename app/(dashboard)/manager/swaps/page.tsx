import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserScope } from "@/lib/scope";
import { ManagerSwapsClient } from "./ManagerSwapsClient";

export default async function ManagerSwapsPage() {
  const user = await requireRole(["manager", "admin"]);
  const scope = await getUserScope(user.id);

  const locationFilter = scope.role === "admin" ? {} : { locationId: { in: scope.locationIds } };

  const swaps = await prisma.swapRequest.findMany({
    where: {
      status: { in: ["accepted", "claimed"] },
      shiftAssignment: { shift: locationFilter },
    },
    include: {
      requester: { select: { id: true, name: true } },
      target: { select: { id: true, name: true } },
      claimer: { select: { id: true, name: true } },
      shiftAssignment: {
        include: { shift: { include: { location: true, requiredSkill: true } } },
      },
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
      <h1 className="text-lg font-semibold text-foreground mb-5">Swap & Drop Requests</h1>
      <ManagerSwapsClient initialSwaps={serialized as never} />
    </div>
  );
}
