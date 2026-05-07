import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const { id } = await params;
  const user = await getSessionUser();
  const { action, reason } = await request.json();

  const swap = await prisma.swapRequest.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true } },
      target: { select: { id: true, name: true } },
      claimer: { select: { id: true, name: true } },
      shiftAssignment: { include: { shift: { include: { location: true } } } },
    },
  });
  if (!swap) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const shiftName = `shift at ${swap.shiftAssignment.shift.location.name}`;

  if (action === "accept") {
    // Staff B accepts a swap request
    if (user.id !== swap.targetUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (swap.status !== "pending") return NextResponse.json({ error: "Request is not pending" }, { status: 409 });

    await prisma.swapRequest.update({ where: { id }, data: { status: "accepted" } });
    await logAudit({ entityType: "swap_request", entityId: id, action: "accept", before: swap, performedBy: user.id });

    // Notify manager(s)
    const managers = await prisma.managerLocationAssignment.findMany({
      where: { locationId: swap.shiftAssignment.shift.locationId },
    });
    for (const m of managers) {
      await notify(m.managerId, "swap_awaiting_approval", "Swap request awaiting approval", `${swap.requester.name} and ${user.name} have agreed to swap the ${shiftName}. Approval needed.`, { swapId: id });
    }
    await notify(swap.requesterId, "swap_accepted", "Your swap was accepted", `${user.name} accepted your swap request for the ${shiftName}. Awaiting manager approval.`, { swapId: id });
    return NextResponse.json({ ok: true });
  }

  if (action === "claim") {
    // Staff claims a drop
    if (user.id === swap.requesterId) return NextResponse.json({ error: "Cannot claim your own drop" }, { status: 409 });
    if (swap.type !== "drop") return NextResponse.json({ error: "Not a drop request" }, { status: 409 });
    if (swap.status !== "pending") return NextResponse.json({ error: "Request is not claimable" }, { status: 409 });

    const alreadyOn = await prisma.shiftAssignment.findFirst({
      where: { shiftId: swap.shiftAssignment.shiftId, userId: user.id, status: "active" },
    });
    if (alreadyOn) return NextResponse.json({ error: "You are already assigned to this shift." }, { status: 409 });

    await prisma.swapRequest.update({ where: { id }, data: { status: "claimed", claimedBy: user.id } });
    await logAudit({ entityType: "swap_request", entityId: id, action: "claim", before: swap, performedBy: user.id });

    const managers = await prisma.managerLocationAssignment.findMany({
      where: { locationId: swap.shiftAssignment.shift.locationId },
    });
    for (const m of managers) {
      await notify(m.managerId, "drop_awaiting_approval", "Drop claim awaiting approval", `${user.name} claimed the dropped ${shiftName}. Approval needed.`, { swapId: id });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    if (user.role !== "manager" && user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!["accepted", "claimed"].includes(swap.status)) return NextResponse.json({ error: "Not awaiting approval" }, { status: 409 });

    const newUserId = swap.type === "swap" ? swap.targetUserId : swap.claimedBy;
    if (!newUserId) return NextResponse.json({ error: "No target user" }, { status: 409 });

    // Check if new assignee already has an active slot on this shift (would violate unique constraint)
    const existingAssignment = await prisma.shiftAssignment.findFirst({
      where: { shiftId: swap.shiftAssignment.shiftId, userId: newUserId, status: "active" },
    });

    if (existingAssignment) {
      // New assignee is already on the shift — just retire the original slot and close the request
      await prisma.shiftAssignment.update({ where: { id: swap.shiftAssignmentId }, data: { status: "dropped" } });
      await prisma.swapRequest.update({ where: { id }, data: { status: "approved", resolvedAt: new Date() } });
    } else {
      await prisma.$transaction([
        prisma.shiftAssignment.update({ where: { id: swap.shiftAssignmentId }, data: { status: swap.type === "swap" ? "swapped_out" : "dropped" } }),
        prisma.shiftAssignment.create({ data: { shiftId: swap.shiftAssignment.shiftId, userId: newUserId, assignedBy: user.id } }),
        prisma.swapRequest.update({ where: { id }, data: { status: "approved", resolvedAt: new Date() } }),
      ]);
    }

    await logAudit({ entityType: "swap_request", entityId: id, action: "approve", before: swap, after: { newUserId }, performedBy: user.id });
    await notify(swap.requesterId, "swap_approved", "Swap approved", `Your ${swap.type} request for the ${shiftName} was approved.`, { swapId: id });
    if (swap.targetUserId) await notify(swap.targetUserId, "swap_approved", "Swap approved", `You've been assigned the ${shiftName} after the swap was approved.`, { swapId: id });
    if (swap.claimedBy) await notify(swap.claimedBy, "drop_approved", "Drop claim approved", `You've been assigned the ${shiftName}.`, { swapId: id });
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    if (user.role !== "manager" && user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!["accepted", "claimed"].includes(swap.status)) return NextResponse.json({ error: "Not awaiting approval" }, { status: 409 });

    await prisma.swapRequest.update({ where: { id }, data: { status: "rejected", resolvedAt: new Date() } });
    await logAudit({ entityType: "swap_request", entityId: id, action: "reject", before: swap, performedBy: user.id, reason });
    await notify(swap.requesterId, "swap_rejected", "Swap rejected", `Your ${swap.type} request for the ${shiftName} was rejected.${reason ? ` Reason: ${reason}` : ""}`, { swapId: id });
    if (swap.targetUserId) await notify(swap.targetUserId, "swap_rejected", "Swap rejected", `The swap for the ${shiftName} was rejected.`, { swapId: id });
    if (swap.claimedBy) await notify(swap.claimedBy, "drop_rejected", "Drop claim rejected", `Your claim on the ${shiftName} was rejected.`, { swapId: id });
    return NextResponse.json({ ok: true });
  }

  if (action === "cancel") {
    if (user.id !== swap.requesterId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (swap.status === "approved") return NextResponse.json({ error: "Cannot cancel an approved request" }, { status: 409 });

    await prisma.swapRequest.update({ where: { id }, data: { status: "cancelled" } });
    await logAudit({ entityType: "swap_request", entityId: id, action: "cancel", before: swap, performedBy: user.id });
    if (swap.targetUserId) await notify(swap.targetUserId, "swap_cancelled", "Swap cancelled", `${swap.requester.name} cancelled the swap request for the ${shiftName}.`, { swapId: id });
    if (swap.claimedBy) await notify(swap.claimedBy, "drop_cancelled", "Drop cancelled", `The drop request for the ${shiftName} was cancelled.`, { swapId: id });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[PATCH /api/swaps/[id]]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
