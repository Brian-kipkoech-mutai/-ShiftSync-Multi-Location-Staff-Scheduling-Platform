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

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (user.role === "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const scope = await getUserScope(user.id);

  const body = await request.json();
  const { locationId, date, startTime, endTime, requiredSkillId, headcount } = body;

  if (!locationId || !date || !startTime || !endTime || !requiredSkillId || !headcount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (scope.role !== "admin" && !scope.locationIds.includes(locationId)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const location = await prisma.location.findUniqueOrThrow({ where: { id: locationId } });
  const { parseShiftTimes, isPremiumShift } = await import("@/lib/timezone");
  const { startUtc, endUtc, isOvernight } = parseShiftTimes(date, startTime, endTime, location.timezone);
  const premium = isPremiumShift(startUtc, location.timezone);

  const shift = await prisma.shift.create({
    data: {
      locationId,
      startUtc,
      endUtc,
      requiredSkillId,
      headcount: Number(headcount),
      isOvernight,
      isPremium: premium,
      createdBy: user.id,
    },
    include: { location: true, requiredSkill: true, assignments: { include: { user: { select: { id: true, name: true } } } } },
  });

  const { logAudit } = await import("@/lib/audit");
  await logAudit({ entityType: "shift", entityId: shift.id, action: "create", after: shift, performedBy: user.id });

  return NextResponse.json(shift, { status: 201 });
}
