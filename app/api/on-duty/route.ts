import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserScope, buildLocationFilter } from "@/lib/scope";

// GET /api/on-duty — shifts currently in progress
export async function GET() {
  const user = await getSessionUser();
  const scope = await getUserScope(user.id);
  const locationFilter = buildLocationFilter(scope);

  const now = new Date();

  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      status: "active",
      shift: {
        ...locationFilter,
        status: "published",
        startUtc: { lte: now },
        endUtc: { gte: now },
      },
    },
    include: {
      user: { select: { id: true, name: true } },
      shift: {
        include: { location: true, requiredSkill: true },
      },
    },
    orderBy: { shift: { location: { name: "asc" } } },
  });

  return NextResponse.json(assignments);
}
