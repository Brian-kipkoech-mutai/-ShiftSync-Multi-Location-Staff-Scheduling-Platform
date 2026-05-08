import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { runAllConstraints } from "@/lib/constraints";
import type { ConstraintViolation } from "@/lib/constraints";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { differenceInMinutes } from "date-fns";
import { getWeekBounds, getDayBounds, toZoned, getAvailabilityInUtc } from "@/lib/timezone";
import { format } from "date-fns-tz";

// GET /api/shifts/[id]/assignments — returns eligible staff with constraint results
// Uses batch DB queries + in-memory constraint evaluation to avoid n+1 round trips.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (user.role === "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const scope = await getUserScope(user.id);

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: { location: true, assignments: { where: { status: "active" } } },
    });
    if (!shift) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (scope.role !== "admin" && !scope.locationIds.includes(shift.locationId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const staff = await prisma.user.findMany({
      where: {
        role: "staff",
        isActive: true,
        locationCertifications: { some: { locationId: shift.locationId, revokedAt: null } },
        shiftAssignments: { none: { shiftId: id, status: "active" } },
      },
      include: {
        skills: { include: { skill: true } },
        locationCertifications: { where: { revokedAt: null }, include: { location: true }, take: 1 },
      },
      orderBy: { name: "asc" },
    });

    if (staff.length === 0) return NextResponse.json([]);

    const staffIds = staff.map((s) => s.id);
    const locationTz = shift.location.timezone;
    const shiftHours = differenceInMinutes(shift.endUtc, shift.startUtc) / 60;

    const { start: weekStart, end: weekEnd } = getWeekBounds(shift.startUtc, locationTz);
    const { start: dayStart, end: dayEnd } = getDayBounds(shift.startUtc, locationTz);

    // Cover 7 days before the shift for consecutive-day checks, plus the full work week
    const batchWindowStart = new Date(
      Math.min(shift.startUtc.getTime() - 7 * 24 * 3600 * 1000, weekStart.getTime())
    );

    const dateStr = format(toZoned(shift.startUtc, locationTz), "yyyy-MM-dd", { timeZone: locationTz });
    const dayOfWeek = toZoned(shift.startUtc, locationTz).getDay();

    // 4 batch queries instead of ~20 per staff member
    const allAssignments = await prisma.shiftAssignment.findMany({
      where: {
        userId: { in: staffIds },
        status: "active",
        shiftId: { not: id },
        shift: { startUtc: { gte: batchWindowStart, lte: weekEnd } },
      },
      include: { shift: { include: { location: true } } },
    });

    const allWindows = await prisma.availabilityWindow.findMany({
      where: { userId: { in: staffIds }, dayOfWeek },
    });

    const allExceptions = await prisma.availabilityException.findMany({
      where: { userId: { in: staffIds }, date: dateStr },
    });

    const allUserTz = await prisma.user.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, homeTimezone: true },
    });

    // Index by userId for O(1) lookups
    const assignmentsByUser = new Map<string, typeof allAssignments>();
    for (const a of allAssignments) {
      if (!assignmentsByUser.has(a.userId)) assignmentsByUser.set(a.userId, []);
      assignmentsByUser.get(a.userId)!.push(a);
    }
    const windowsByUser = new Map<string, typeof allWindows>();
    for (const w of allWindows) {
      if (!windowsByUser.has(w.userId)) windowsByUser.set(w.userId, []);
      windowsByUser.get(w.userId)!.push(w);
    }
    const exceptionsByUser = new Map<string, typeof allExceptions>();
    for (const e of allExceptions) {
      if (!exceptionsByUser.has(e.userId)) exceptionsByUser.set(e.userId, []);
      exceptionsByUser.get(e.userId)!.push(e);
    }
    const userHomeTz = new Map(allUserTz.map((u) => [u.id, u.homeTimezone]));

    const results = staff.map((s) => {
      const violations: ConstraintViolation[] = [];
      const ua = assignmentsByUser.get(s.id) ?? [];
      const uw = windowsByUser.get(s.id) ?? [];
      const ue = exceptionsByUser.get(s.id) ?? [];
      const homeTz = userHomeTz.get(s.id) ?? locationTz;

      // Headcount
      if (shift.assignments.length >= shift.headcount) {
        violations.push({ rule: "headcount_cap", message: `Shift is already at capacity (${shift.assignments.length}/${shift.headcount}).`, severity: "block" });
      }

      // Skill match (staff.skills already fetched)
      if (!s.skills.some((sk) => sk.skillId === shift.requiredSkillId)) {
        violations.push({ rule: "skill_match", message: `Staff does not have the required skill.`, severity: "block" });
      }

      // Double booking
      const overlapping = ua.find(
        (a) => a.shift.startUtc < shift.endUtc && a.shift.endUtc > shift.startUtc
      );
      if (overlapping) {
        violations.push({ rule: "no_double_booking", message: `Already assigned to an overlapping shift at ${overlapping.shift.location.name}.`, severity: "block" });
      }

      // 10-hour rest period
      const tooClose = ua.find((a) => {
        if (a.shift.startUtc < shift.endUtc && a.shift.endUtc > shift.startUtc) return false;
        const gapBefore = (shift.startUtc.getTime() - a.shift.endUtc.getTime()) / 3_600_000;
        const gapAfter = (a.shift.startUtc.getTime() - shift.endUtc.getTime()) / 3_600_000;
        return (gapBefore > 0 && gapBefore < 10) || (gapAfter > 0 && gapAfter < 10);
      });
      if (tooClose) {
        const gapH = Math.round(
          tooClose.shift.endUtc.getTime() < shift.startUtc.getTime()
            ? (shift.startUtc.getTime() - tooClose.shift.endUtc.getTime()) / 360_000
            : (tooClose.shift.startUtc.getTime() - shift.endUtc.getTime()) / 360_000
        ) / 10;
        violations.push({ rule: "rest_period", message: `Only ${gapH}h rest between shifts — minimum is 10h.`, severity: "block" });
      }

      // Availability
      const fullBlock = ue.find((e) => e.isUnavailable);
      if (fullBlock) {
        violations.push({ rule: "availability", message: `Staff has marked themselves unavailable on ${dateStr}.`, severity: "block" });
      } else {
        const override = ue.find((e) => !e.isUnavailable && e.startTime && e.endTime);
        let covered = false;
        if (override) {
          const w = getAvailabilityInUtc(
            { dayOfWeek, startTime: override.startTime!, endTime: override.endTime! },
            homeTz,
            shift.startUtc
          );
          covered = shift.startUtc >= w.startUtc && shift.endUtc <= w.endUtc;
        }
        if (!covered) {
          if (uw.length === 0) {
            violations.push({ rule: "availability", message: `Staff has no availability set for this day.`, severity: "block" });
          } else if (
            !uw.some((w) => {
              const { startUtc: ws, endUtc: we } = getAvailabilityInUtc(w, homeTz, shift.startUtc);
              return shift.startUtc >= ws && shift.endUtc <= we;
            })
          ) {
            violations.push({ rule: "availability", message: `Shift falls outside staff's available hours.`, severity: "block" });
          }
        }
      }

      // Daily hours cap
      const dayH = ua
        .filter((a) => a.shift.startUtc >= dayStart && a.shift.startUtc < dayEnd)
        .reduce((sum, a) => sum + differenceInMinutes(a.shift.endUtc, a.shift.startUtc) / 60, 0);
      const totalDay = dayH + shiftHours;
      if (totalDay > 12) {
        violations.push({ rule: "daily_12h_cap", message: `Would bring daily hours to ${totalDay.toFixed(1)}h — max 12h.`, severity: "block" });
      } else if (totalDay > 8) {
        violations.push({ rule: "daily_8h_warning", message: `Daily hours would be ${totalDay.toFixed(1)}h — over 8h guideline.`, severity: "warning" });
      }

      // Weekly hours cap
      const weekH = ua
        .filter((a) => a.shift.startUtc >= weekStart && a.shift.startUtc <= weekEnd)
        .reduce((sum, a) => sum + differenceInMinutes(a.shift.endUtc, a.shift.startUtc) / 60, 0);
      const totalWeek = weekH + shiftHours;
      if (totalWeek > 40) {
        violations.push({ rule: "weekly_40h_cap", message: `Would bring weekly hours to ${totalWeek.toFixed(1)}h — max 40h (override required).`, severity: "override" });
      } else if (totalWeek >= 35) {
        violations.push({ rule: "weekly_35h_warning", message: `Weekly hours would reach ${totalWeek.toFixed(1)}h — approaching 40h limit.`, severity: "warning" });
      }

      // Consecutive days
      let consecutiveBefore = 0;
      for (let i = 1; i <= 6; i++) {
        const checkDate = new Date(shift.startUtc.getTime() - i * 24 * 3600 * 1000);
        const { start: ds, end: de } = getDayBounds(checkDate, homeTz);
        if (ua.some((a) => a.shift.startUtc >= ds && a.shift.startUtc < de)) {
          consecutiveBefore++;
        } else {
          break;
        }
      }
      const totalConsecutive = consecutiveBefore + 1;
      if (totalConsecutive >= 7) {
        violations.push({ rule: "consecutive_7th_day", message: `Day ${totalConsecutive} in a row — requires manager override.`, severity: "override" });
      } else if (totalConsecutive === 6) {
        violations.push({ rule: "consecutive_6th_day", message: `6th consecutive working day.`, severity: "warning" });
      }

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        skills: s.skills.map((sk) => sk.skill.name),
        weeklyHours: Math.round(weekH * 10) / 10,
        homeLocation: s.locationCertifications[0]?.location.name ?? "—",
        violations,
        canAssign: !violations.some((v) => v.severity === "block"),
        needsOverride: violations.some((v) => v.severity === "override"),
      };
    });

    // Sort: available first → override-only → fully blocked
    const order = (s: (typeof results)[0]) => s.canAssign ? 0 : s.needsOverride ? 1 : 2;
    results.sort((a, b) => order(a) - order(b));

    return NextResponse.json(results);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[GET /api/shifts/[id]/assignments]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
    const currentCount = await tx.shiftAssignment.count({ where: { shiftId: id, status: "active" } });
    if (currentCount >= shift.headcount) {
      throw new Error(`HEADCOUNT_EXCEEDED:This shift is already fully staffed (${shift.headcount}/${shift.headcount}).`);
    }

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

  if (overrideReason) {
    const weekBounds = getWeekBounds(shift.startUtc, shift.location.timezone);
    await prisma.overtimeOverride.create({
      data: { userId, shiftId: id, weekStart: weekBounds.start, type: "weekly_40h", approvedBy: user.id, reason: overrideReason },
    });
    await logAudit({ entityType: "overtime_override", entityId: id, action: "override", after: { userId, reason: overrideReason }, performedBy: user.id });
    const otherManagers = await prisma.managerLocationAssignment.findMany({
      where: { locationId: shift.locationId, managerId: { not: user.id } },
    });
    for (const m of otherManagers) {
      await notify(m.managerId, "overtime_override", "Overtime override exercised", `${user.name} overrode an overtime block for a staff member at ${a.shift.location.name}. Reason: ${overrideReason}`, { shiftId: id });
    }
  }

  await notify(userId, "shift_assigned", "You've been assigned a shift", `You've been assigned to a shift at ${a.shift.location.name}.`, { shiftId: id });
  await logAudit({ entityType: "assignment", entityId: a.id, action: "create", after: a, performedBy: user.id });

  // Notify OTHER managers at this location if assignment triggers an overtime warning
  const { violations } = await runAllConstraints(userId, id, undefined, { skipAlternatives: true });
  const warnings = violations.filter((v: ConstraintViolation) => v.severity === "warning");
  if (warnings.length > 0) {
    const otherManagers = await prisma.managerLocationAssignment.findMany({
      where: { locationId: shift.locationId, managerId: { not: user.id } },
    });
    const warningMsg = warnings.map((v: ConstraintViolation) => v.message).join("; ");
    for (const m of otherManagers) {
      await notify(m.managerId, "overtime_warning", `Overtime warning — ${a.user.name}`, warningMsg, { shiftId: id });
    }
  }

  return NextResponse.json(a, { status: 201 });
}
