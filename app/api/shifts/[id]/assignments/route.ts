import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { runAllConstraints } from "@/lib/constraints";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { differenceInMinutes } from "date-fns";

// GET /api/shifts/[id]/assignments — returns eligible staff with constraint results
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (user.role === "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const scope = await getUserScope(user.id);

  const shift = await prisma.shift.findUnique({ where: { id }, include: { location: true } });
  if (!shift) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (scope.role !== "admin" && !scope.locationIds.includes(shift.locationId)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Get all active staff with active certification at this location
  const staff = await prisma.user.findMany({
    where: {
      role: "staff",
      isActive: true,
      locationCertifications: { some: { locationId: shift.locationId, revokedAt: null } },
      // exclude already-assigned staff
      shiftAssignments: { none: { shiftId: id, status: "active" } },
    },
    include: {
      skills: { include: { skill: true } },
      shiftAssignments: {
        where: { status: "active", shift: { startUtc: { gte: new Date(new Date().setUTCDate(new Date().getUTCDate() - 7)) } } },
        include: { shift: true },
      },
      locationCertifications: { where: { revokedAt: null }, include: { location: true }, take: 1 },
    },
    orderBy: { name: "asc" },
  });

  // Run constraint checks in parallel (batched)
  const results = await Promise.all(
    staff.map(async (s) => {
      const constraints = await runAllConstraints(s.id, id);
      const weeklyHours = s.shiftAssignments.reduce(
        (sum, a) => sum + differenceInMinutes(a.shift.endUtc, a.shift.startUtc) / 60,
        0
      );
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        skills: s.skills.map((sk) => sk.skill.name),
        weeklyHours: Math.round(weeklyHours * 10) / 10,
        homeLocation: s.locationCertifications[0]?.location.name ?? "—",
        violations: constraints.violations,
        canAssign: !constraints.violations.some((v) => v.severity === "block"),
        needsOverride: constraints.violations.some((v) => v.severity === "override"),
      };
    })
  );

  return NextResponse.json(results);
}

// POST /api/shifts/[id]/assignments — assign a staff member
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (user.role === "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const scope = await getUserScope(user.id);

  const shift = await prisma.shift.findUnique({ where: { id }, include: { location: true } });
  if (!shift) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (scope.role !== "admin" && !scope.locationIds.includes(shift.locationId)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { userId, overrideReason } = await request.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  // Use a transaction to prevent concurrent over-assignment
  const assignment = await prisma.$transaction(async (tx) => {
    // Re-check headcount within transaction
    const currentCount = await tx.shiftAssignment.count({ where: { shiftId: id, status: "active" } });
    if (currentCount >= shift.headcount) {
      throw new Error(`HEADCOUNT_EXCEEDED:This shift is already fully staffed (${shift.headcount}/${shift.headcount}).`);
    }

    // Re-check double booking
    const overlap = await tx.shiftAssignment.findFirst({
      where: {
        userId,
        status: "active",
        shift: { AND: [{ startUtc: { lt: shift.endUtc } }, { endUtc: { gt: shift.startUtc } }, { id: { not: id } }] },
      },
    });
    if (overlap) throw new Error("DOUBLE_BOOKING:This staff member is already assigned to an overlapping shift.");

    return tx.shiftAssignment.create({
      data: { shiftId: id, userId, assignedBy: user.id },
      include: { user: { select: { id: true, name: true, email: true } }, shift: { include: { location: true } } },
    });
  }).catch((err: Error) => {
    if (err.message.startsWith("HEADCOUNT_EXCEEDED:") || err.message.startsWith("DOUBLE_BOOKING:")) {
      return { _error: err.message.split(":")[1] };
    }
    throw err;
  });

  if ("_error" in (assignment as object)) {
    return NextResponse.json({ error: (assignment as { _error: string })._error }, { status: 409 });
  }

  const a = assignment as Awaited<ReturnType<typeof prisma.shiftAssignment.create>> & {
    user: { id: string; name: string; email: string };
    shift: { location: { name: string } };
  };

  // Save override if provided
  if (overrideReason) {
    const { getWeekBounds } = await import("@/lib/timezone");
    const weekBounds = getWeekBounds(shift.startUtc, shift.location.timezone);
    await prisma.overtimeOverride.create({
      data: {
        userId,
        shiftId: id,
        weekStart: weekBounds.start,
        type: "weekly_40h",
        approvedBy: user.id,
        reason: overrideReason,
      },
    });
    await logAudit({ entityType: "overtime_override", entityId: id, action: "override", after: { userId, reason: overrideReason }, performedBy: user.id });
    // Notify other managers at this location
    const otherManagers = await prisma.managerLocationAssignment.findMany({
      where: { locationId: shift.locationId, managerId: { not: user.id } },
    });
    for (const m of otherManagers) {
      await notify(m.managerId, "overtime_override", "Overtime override exercised", `${user.name} overrode an overtime block for a staff member at ${a.shift.location.name}. Reason: ${overrideReason}`, { shiftId: id });
    }
  }

  await notify(userId, "shift_assigned", "You've been assigned a shift", `You've been assigned to a shift at ${a.shift.location.name}.`, { shiftId: id });
  await logAudit({ entityType: "assignment", entityId: a.id, action: "create", after: a, performedBy: user.id });

  return NextResponse.json(a, { status: 201 });
}
