import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Returns staff members certified at the same location (for swap target selection)
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");
  const shiftId = searchParams.get("shiftId");

  if (!locationId) return NextResponse.json({ error: "locationId required" }, { status: 400 });

  const shift = shiftId ? await prisma.shift.findUnique({ where: { id: shiftId } }) : null;

  const staff = await prisma.user.findMany({
    where: {
      id: { not: user.id },
      role: "staff",
      isActive: true,
      locationCertifications: { some: { locationId, revokedAt: null } },
      ...(shift ? { skills: { some: { skillId: shift.requiredSkillId } } } : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(staff);
}
