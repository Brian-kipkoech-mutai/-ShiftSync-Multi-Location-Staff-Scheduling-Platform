import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/shifts/available — pending drop requests the current staff can claim
export async function GET() {
  const user = await getSessionUser();
  if (user.role !== "staff") return NextResponse.json({ error: "Staff only" }, { status: 403 });

  const now = new Date();
  const cutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h from now

  const userCerts = await prisma.locationCertification.findMany({
    where: { userId: user.id, revokedAt: null },
    select: { locationId: true },
  });
  const locationIds = userCerts.map((c) => c.locationId);

  const userSkills = await prisma.userSkill.findMany({
    where: { userId: user.id },
    select: { skillId: true },
  });
  const skillIds = userSkills.map((s) => s.skillId);

  const drops = await prisma.swapRequest.findMany({
    where: {
      type: "drop",
      status: "pending",
      requesterId: { not: user.id },
      shiftAssignment: {
        shift: {
          startUtc: { gt: cutoff },
          locationId: { in: locationIds },
          requiredSkillId: { in: skillIds },
          // exclude shifts the claimer is already assigned to
          assignments: { none: { userId: user.id, status: "active" } },
        },
      },
    },
    include: {
      requester: { select: { id: true, name: true } },
      shiftAssignment: {
        include: {
          shift: { include: { location: true, requiredSkill: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(drops);
}
