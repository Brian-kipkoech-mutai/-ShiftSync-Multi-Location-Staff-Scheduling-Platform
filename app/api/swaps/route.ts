import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runAllConstraints } from "@/lib/constraints";
import { logAudit } from "@/lib/audit";
import { notify, notifyMany } from "@/lib/notifications";

// GET /api/swaps — returns swap requests relevant to the current user
export async function GET() {
  const user = await getSessionUser();

  if (user.role === "manager" || user.role === "admin") {
    // Managers see pending requests at their locations
    const scope = user.role === "admin" ? null :
      (await prisma.managerLocationAssignment.findMany({ where: { managerId: user.id }, select: { locationId: true } }))
        .map((a) => a.locationId);

    const swaps = await prisma.swapRequest.findMany({
      where: {
        status: { in: ["accepted", "claimed"] },
        shiftAssignment: {
          shift: scope ? { locationId: { in: scope } } : undefined,
        },
      },
      include: {
        requester: { select: { id: true, name: true } },
        target: { select: { id: true, name: true } },
        claimer: { select: { id: true, name: true } },
        shiftAssignment: {
          include: {
            shift: { include: { location: true, requiredSkill: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(swaps);
  }

  // Staff see their own outgoing + incoming
  const swaps = await prisma.swapRequest.findMany({
    where: {
      OR: [
        { requesterId: user.id },
        { targetUserId: user.id },
        { claimedBy: user.id },
      ],
    },
    include: {
      requester: { select: { id: true, name: true } },
      target: { select: { id: true, name: true } },
      claimer: { select: { id: true, name: true } },
      shiftAssignment: {
        include: {
          shift: { include: { location: true, requiredSkill: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(swaps);
}

// POST /api/swaps — initiate a swap or drop request
export async function POST(request: NextRequest) {
  try {
  const user = await getSessionUser();
  if (user.role !== "staff") return NextResponse.json({ error: "Only staff can initiate swap/drop requests" }, { status: 403 });

  const body = await request.json();
  const { assignmentId, type } = body;
  const targetUserId: string | undefined = typeof body.targetUserId === "string" ? body.targetUserId : undefined;

  if (!assignmentId || !type) return NextResponse.json({ error: "assignmentId and type required" }, { status: 400 });
  if (type === "swap" && !targetUserId) return NextResponse.json({ error: "targetUserId required for swap" }, { status: 400 });

  const assignment = await prisma.shiftAssignment.findUnique({
    where: { id: assignmentId },
    include: { shift: { include: { location: true, requiredSkill: true } } },
  });
  if (!assignment || assignment.userId !== user.id) {
    return NextResponse.json({ error: "Assignment not found or not yours" }, { status: 404 });
  }
  if (assignment.status !== "active") return NextResponse.json({ error: "Assignment is not active" }, { status: 409 });

  // Max 3 pending requests
  const pendingCount = await prisma.swapRequest.count({ where: { requesterId: user.id, status: "pending" } });
  if (pendingCount >= 3) {
    return NextResponse.json({ error: "You already have 3 pending swap/drop requests." }, { status: 409 });
  }

  if (type === "swap" && targetUserId) {
    // Validate target staff's constraints
    const constraints = await runAllConstraints(targetUserId, assignment.shiftId);
    const blocks = constraints.violations.filter((v) => v.severity === "block");
    if (blocks.length > 0) {
      return NextResponse.json({ error: `Target staff cannot take this shift: ${blocks[0].message}`, violations: blocks }, { status: 409 });
    }
    // Target can't be at 3 pending themselves
    const targetPending = await prisma.swapRequest.count({ where: { requesterId: targetUserId, status: "pending" } });
    if (targetPending >= 3) {
      return NextResponse.json({ error: "Target staff already has 3 pending requests." }, { status: 409 });
    }
  }

  const swap = await prisma.swapRequest.create({
    data: { shiftAssignmentId: assignmentId, requesterId: user.id, targetUserId: type === "swap" ? targetUserId : null, type },
    include: { shiftAssignment: { include: { shift: { include: { location: true } } } } },
  });

  await logAudit({ entityType: "swap_request", entityId: swap.id, action: "create", after: swap, performedBy: user.id });

  if (type === "swap" && targetUserId) {
    await notify(targetUserId, "swap_request_received", "Swap request", `${user.name} wants to swap their shift at ${assignment.shift.location.name} with you.`, { swapId: swap.id });
  }

  if (type === "drop") {
    // Notify qualified staff at this location
    const qualifiedStaff = await prisma.user.findMany({
      where: {
        role: "staff",
        isActive: true,
        id: { not: user.id },
        locationCertifications: { some: { locationId: assignment.shift.locationId, revokedAt: null } },
        skills: { some: { skillId: assignment.shift.requiredSkillId } },
      },
      select: { id: true },
    });
    if (qualifiedStaff.length > 0) {
      await notifyMany(
        qualifiedStaff.map((s) => s.id),
        "drop_available",
        "Shift available to pick up",
        `A ${assignment.shift.requiredSkill?.name ?? "shift"} shift at ${assignment.shift.location.name} is now available to claim.`,
        { swapId: swap.id }
      );
    }
  }

  return NextResponse.json(swap, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[POST /api/swaps]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
