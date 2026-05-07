import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getSessionUser();
  const now = new Date();

  const assignments = await prisma.shiftAssignment.findMany({
    where: { userId: user.id, status: "active", shift: { startUtc: { gte: now } } },
    include: {
      shift: { include: { location: true, requiredSkill: true } },
      swapRequests: { where: { status: { in: ["pending", "accepted"] } } },
    },
    orderBy: { shift: { startUtc: "asc" } },
    take: 20,
  });

  return NextResponse.json(assignments);
}
