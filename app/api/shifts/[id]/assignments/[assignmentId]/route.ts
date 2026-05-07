import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const { id, assignmentId } = await params;
  const user = await getSessionUser();
  if (user.role === "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const scope = await getUserScope(user.id);

  const assignment = await prisma.shiftAssignment.findUnique({
    where: { id: assignmentId },
    include: { shift: { include: { location: true } }, user: true },
  });
  if (!assignment || assignment.shiftId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (scope.role !== "admin" && !scope.locationIds.includes(assignment.shift.locationId)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  await prisma.shiftAssignment.update({ where: { id: assignmentId }, data: { status: "removed" } });
  await notify(assignment.userId, "shift_unassigned", "Removed from a shift", `You have been removed from a shift at ${assignment.shift.location.name}.`, { shiftId: id });
  await logAudit({ entityType: "assignment", entityId: assignmentId, action: "remove", before: assignment, performedBy: user.id });

  return NextResponse.json({ ok: true });
}
