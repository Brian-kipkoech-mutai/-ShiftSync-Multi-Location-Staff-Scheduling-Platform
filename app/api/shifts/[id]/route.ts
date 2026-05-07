import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { parseShiftTimes, isPremiumShift } from "@/lib/timezone";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { runAllConstraints } from "@/lib/constraints";
import { addHours } from "date-fns";

async function getEditCutoffHours(): Promise<number> {
  const s = await prisma.systemSettings.findUnique({ where: { key: "edit_cutoff_hours" } });
  return s ? parseInt(s.value) : 48;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (user.role === "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const scope = await getUserScope(user.id);

  const shift = await prisma.shift.findUnique({
    where: { id },
    include: { location: true, assignments: { where: { status: "active" }, include: { user: true } } },
  });
  if (!shift) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (scope.role !== "admin" && !scope.locationIds.includes(shift.locationId)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const cutoffHours = await getEditCutoffHours();
  if (addHours(new Date(), cutoffHours) > shift.startUtc) {
    return NextResponse.json({ error: `Shift starts within ${cutoffHours}h — edits are locked.` }, { status: 409 });
  }

  const body = await request.json();
  const { date, startTime, endTime, requiredSkillId, headcount } = body;

  const before = { ...shift, location: undefined, assignments: undefined };
  let startUtc = shift.startUtc;
  let endUtc = shift.endUtc;
  let isOvernight = shift.isOvernight;
  let isPremium = shift.isPremium;

  if (date || startTime || endTime) {
    const location = shift.location;
    const localDate = date ?? (startUtc.toISOString().split("T")[0]);
    const localStart = startTime ?? startUtc.toISOString().split("T")[1].slice(0, 5);
    const localEnd = endTime ?? endUtc.toISOString().split("T")[1].slice(0, 5);
    const parsed = parseShiftTimes(localDate, localStart, localEnd, location.timezone);
    startUtc = parsed.startUtc;
    endUtc = parsed.endUtc;
    isOvernight = parsed.isOvernight;
    isPremium = isPremiumShift(startUtc, location.timezone);
  }

  const updated = await prisma.shift.update({
    where: { id },
    data: {
      startUtc,
      endUtc,
      isOvernight,
      isPremium,
      ...(requiredSkillId ? { requiredSkillId } : {}),
      ...(headcount ? { headcount: Number(headcount) } : {}),
    },
    include: { location: true, requiredSkill: true, assignments: { where: { status: "active" }, include: { user: { select: { id: true, name: true } } } } },
  });

  // Auto-cancel pending swaps for this shift
  const pendingSwaps = await prisma.swapRequest.findMany({
    where: { shiftAssignment: { shiftId: id }, status: { in: ["pending", "accepted", "claimed"] } },
    include: { requester: true, target: true, claimer: true },
  });
  for (const swap of pendingSwaps) {
    await prisma.swapRequest.update({ where: { id: swap.id }, data: { status: "cancelled" } });
    await logAudit({ entityType: "swap_request", entityId: swap.id, action: "auto-cancel-on-edit", before: swap, after: { status: "cancelled" }, performedBy: user.id });
    const msg = `Your ${swap.type} request was auto-cancelled because the shift was edited.`;
    await notify(swap.requesterId, "swap_auto_cancelled", "Swap request cancelled", msg, { shiftId: id });
    if (swap.targetUserId) await notify(swap.targetUserId, "swap_auto_cancelled", "Swap request cancelled", msg, { shiftId: id });
    if (swap.claimedBy) await notify(swap.claimedBy, "swap_auto_cancelled", "Swap request cancelled", msg, { shiftId: id });
  }

  // Notify assigned staff of shift change
  for (const a of shift.assignments) {
    await notify(a.userId, "shift_edited", "Your shift was updated", `A shift you're assigned to at ${shift.location.name} has been updated.`, { shiftId: id });
  }

  // If the required skill changed, unassign staff who no longer qualify
  const skillChanged = requiredSkillId && requiredSkillId !== shift.requiredSkillId;
  let unassignedStaff: { id: string; name: string }[] = [];

  if (skillChanged && shift.assignments.length > 0) {
    const assigneeIds = shift.assignments.map((a) => a.userId);
    const holdersOfNewSkill = await prisma.userSkill.findMany({
      where: { userId: { in: assigneeIds }, skillId: requiredSkillId },
      select: { userId: true },
    });
    const holderIds = new Set(holdersOfNewSkill.map((s) => s.userId));
    const toRemove = shift.assignments.filter((a) => !holderIds.has(a.userId));
    unassignedStaff = toRemove.map((a) => ({ id: a.userId, name: a.user.name }));

    if (unassignedStaff.length > 0) {
      const newSkill = updated.requiredSkill;
      const names = unassignedStaff.map((a) => a.name).join(", ");

      // Remove the disqualified assignments
      await prisma.shiftAssignment.updateMany({
        where: { id: { in: toRemove.map((a) => a.id) } },
        data: { status: "removed" },
      });

      // Notify managers
      const managerMsg = `Skill changed to "${newSkill.name}" on the shift at ${shift.location.name}. The following staff were automatically unassigned as they no longer qualify: ${names}.`;
      await notify(user.id, "skill_mismatch_warning", "Staff unassigned — skill mismatch", managerMsg, { shiftId: id });
      const locationManagers = await prisma.managerLocationAssignment.findMany({
        where: { locationId: shift.locationId, managerId: { not: user.id } },
        select: { managerId: true },
      });
      for (const m of locationManagers) {
        await notify(m.managerId, "skill_mismatch_warning", "Staff unassigned — skill mismatch", managerMsg, { shiftId: id });
      }

      // Notify each unassigned staff member
      for (const a of unassignedStaff) {
        await notify(a.id, "shift_unassigned", "Removed from a shift", `You have been unassigned from your shift at ${shift.location.name} because the required skill was changed to "${newSkill.name}", which you do not currently hold. Please contact your manager.`, { shiftId: id });
      }

      await logAudit({ entityType: "shift", entityId: id, action: "skill-change-unassign", before: { assignees: unassignedStaff }, after: { status: "removed", reason: `Required skill changed to ${newSkill.name}` }, performedBy: user.id });
    }
  }

  // If shift times changed, re-check time-sensitive constraints for remaining assigned staff
  const timeChanged = !!(date || startTime || endTime);
  const alreadyUnassignedIds = new Set(unassignedStaff.map((s) => s.id));

  if (timeChanged && shift.assignments.length > 0) {
    const remaining = shift.assignments.filter((a) => !alreadyUnassignedIds.has(a.userId));
    const timeViolators: { id: string; name: string; reason: string }[] = [];

    for (const a of remaining) {
      const { violations } = await runAllConstraints(a.userId, id, undefined, { skipAlternatives: true });
      const timeRules = new Set(["no_double_booking", "rest_period", "availability", "daily_12h_cap"]);
      const blocks = violations.filter((v) => v.severity === "block" && timeRules.has(v.rule));
      if (blocks.length > 0) {
        timeViolators.push({ id: a.userId, name: a.user.name, reason: blocks[0].message });
      }
    }

    if (timeViolators.length > 0) {
      await prisma.shiftAssignment.updateMany({
        where: { shiftId: id, userId: { in: timeViolators.map((v) => v.id) }, status: "active" },
        data: { status: "removed" },
      });

      const names = timeViolators.map((v) => v.name).join(", ");
      const managerMsg = `Shift time was changed at ${shift.location.name}. The following staff were automatically unassigned because they no longer meet time constraints: ${names}.`;

      await notify(user.id, "skill_mismatch_warning", "Staff unassigned — time change conflict", managerMsg, { shiftId: id });
      const locationManagers = await prisma.managerLocationAssignment.findMany({
        where: { locationId: shift.locationId, managerId: { not: user.id } },
        select: { managerId: true },
      });
      for (const m of locationManagers) {
        await notify(m.managerId, "skill_mismatch_warning", "Staff unassigned — time change conflict", managerMsg, { shiftId: id });
      }

      for (const v of timeViolators) {
        await notify(v.id, "shift_unassigned", "Removed from a shift", `You have been removed from a shift at ${shift.location.name} because the time was changed. Reason: ${v.reason}`, { shiftId: id });
      }

      await logAudit({
        entityType: "shift", entityId: id, action: "time-change-unassign",
        before: { assignees: timeViolators.map((v) => ({ id: v.id, name: v.name })) },
        after: { status: "removed", reason: "Shift time change caused constraint violation" },
        performedBy: user.id,
      });

      unassignedStaff = [...unassignedStaff, ...timeViolators.map((v) => ({ id: v.id, name: v.name }))];
    }
  }

  await logAudit({ entityType: "shift", entityId: id, action: "edit", before, after: updated, performedBy: user.id });
  return NextResponse.json({ ...updated, unassignedStaff });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (user.role === "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const scope = await getUserScope(user.id);

  const shift = await prisma.shift.findUnique({
    where: { id },
    include: { assignments: { where: { status: "active" }, include: { user: true } } },
  });
  if (!shift) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (scope.role !== "admin" && !scope.locationIds.includes(shift.locationId)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  if (shift.status !== "draft") {
    return NextResponse.json({ error: "Only draft shifts can be deleted." }, { status: 409 });
  }

  // Notify assigned staff before deletion
  for (const a of shift.assignments) {
    await notify(a.userId, "shift_deleted", "A shift was removed", `A draft shift you were assigned to has been deleted.`, { shiftId: id });
  }

  await logAudit({ entityType: "shift", entityId: id, action: "delete", before: shift, performedBy: user.id });
  await prisma.shift.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
