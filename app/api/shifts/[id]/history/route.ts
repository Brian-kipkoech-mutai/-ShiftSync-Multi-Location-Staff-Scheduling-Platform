import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (user.role === "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const scope = await getUserScope(user.id);

    const shift = await prisma.shift.findUnique({ where: { id }, select: { locationId: true } });
    if (!shift) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (scope.role !== "admin" && !scope.locationIds.includes(shift.locationId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Include removed assignments so their audit entries appear in history
    const assignments = await prisma.shiftAssignment.findMany({
      where: { shiftId: id },
      select: { id: true },
    });
    const assignmentIds = assignments.map((a) => a.id);

    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: "shift", entityId: id },
          ...(assignmentIds.length > 0 ? [{ entityType: "assignment" as const, entityId: { in: assignmentIds } }] : []),
          { entityType: "overtime_override", entityId: id },
        ],
      },
      include: { performer: { select: { name: true } } },
      orderBy: { performedAt: "desc" },
    });

    return NextResponse.json(
      logs.map((l) => ({
        id: l.id,
        entityType: l.entityType,
        action: l.action,
        performedByName: l.performer.name,
        performedAt: l.performedAt,
        reason: l.reason,
        before: l.beforeState,
        after: l.afterState,
      }))
    );
  } catch (err: unknown) {
    console.error("[GET /api/shifts/[id]/history]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
