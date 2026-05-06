import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserScope, buildLocationFilter } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { getWeekBounds } from "@/lib/timezone";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  const scope = await getUserScope(user.id);
  const { searchParams } = new URL(request.url);

  const weekParam = searchParams.get("week"); // ISO date string of Monday
  const locationIds = searchParams.getAll("locationId");

  const weekStart = weekParam ? new Date(weekParam) : (() => {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + diff);
    monday.setUTCHours(0, 0, 0, 0);
    return monday;
  })();

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);

  const locationFilter = buildLocationFilter(scope);

  const shifts = await prisma.shift.findMany({
    where: {
      ...locationFilter,
      ...(locationIds.length > 0 ? { locationId: { in: locationIds } } : {}),
      startUtc: { gte: weekStart, lt: weekEnd },
    },
    include: {
      location: true,
      requiredSkill: true,
      assignments: {
        where: { status: "active" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
    orderBy: { startUtc: "asc" },
  });

  return NextResponse.json(shifts);
}
