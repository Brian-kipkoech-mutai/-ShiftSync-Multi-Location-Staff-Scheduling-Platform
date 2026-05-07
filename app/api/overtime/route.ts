import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserScope } from "@/lib/scope";
import { startOfWeek, endOfWeek } from "date-fns";

// GET /api/overtime?weekStart=YYYY-MM-DD — weekly hours per staff for scoped locations
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  const scope = await getUserScope(user.id);

  const { searchParams } = new URL(request.url);
  const weekStartParam = searchParams.get("weekStart");
  const weekStart = weekStartParam ? new Date(weekStartParam) : startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const locationIds = scope.role === "admin" ? undefined : scope.locationIds;

  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      status: "active",
      shift: {
        startUtc: { gte: weekStart, lte: weekEnd },
        status: "published",
        ...(locationIds ? { locationId: { in: locationIds } } : {}),
      },
    },
    include: {
      user: { select: { id: true, name: true, desiredHours: true } },
      shift: { select: { startUtc: true, endUtc: true, location: { select: { id: true, name: true } } } },
    },
  });

  // Aggregate hours per user
  const userMap = new Map<string, {
    userId: string;
    name: string;
    hours: number;
    desiredHours: number | null;
    shiftCount: number;
  }>();

  for (const a of assignments) {
    const hours = (new Date(a.shift.endUtc).getTime() - new Date(a.shift.startUtc).getTime()) / 3600000;
    const existing = userMap.get(a.userId);
    if (existing) {
      existing.hours += hours;
      existing.shiftCount++;
    } else {
      userMap.set(a.userId, {
        userId: a.userId,
        name: a.user.name,
        hours,
        desiredHours: a.user.desiredHours?.hoursPerWeek ?? null,
        shiftCount: 1,
      });
    }
  }

  const result = Array.from(userMap.values()).sort((a, b) => b.hours - a.hours);

  return NextResponse.json({
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    staff: result,
  });
}
