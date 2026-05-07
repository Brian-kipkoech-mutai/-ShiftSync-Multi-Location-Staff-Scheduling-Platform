import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserScope } from "@/lib/scope";
import { subWeeks, startOfWeek, endOfWeek } from "date-fns";

// GET /api/analytics/fairness?weeks=4&locationId=...
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  const scope = await getUserScope(user.id);
  const { searchParams } = new URL(request.url);
  const weeks = parseInt(searchParams.get("weeks") ?? "4", 10);
  const locationIdFilter = searchParams.get("locationId") ?? null;

  const locationIds = scope.role === "admin"
    ? locationIdFilter ? [locationIdFilter] : undefined
    : locationIdFilter && scope.locationIds.includes(locationIdFilter)
      ? [locationIdFilter]
      : scope.locationIds;

  const now = new Date();
  const rangeStart = startOfWeek(subWeeks(now, weeks), { weekStartsOn: 1 });
  const rangeEnd = endOfWeek(now, { weekStartsOn: 1 });

  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      status: "active",
      shift: {
        startUtc: { gte: rangeStart, lte: rangeEnd },
        status: "published",
        ...(locationIds ? { locationId: { in: locationIds } } : {}),
      },
    },
    include: {
      user: { select: { id: true, name: true, desiredHours: true } },
      shift: {
        select: {
          startUtc: true,
          endUtc: true,
          isPremium: true,
          location: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Aggregate per staff
  const staffMap = new Map<string, {
    userId: string;
    name: string;
    totalHours: number;
    premiumShifts: number;
    premiumHours: number;
    desiredHoursPerWeek: number | null;
    shiftCount: number;
  }>();

  for (const a of assignments) {
    const hours = (new Date(a.shift.endUtc).getTime() - new Date(a.shift.startUtc).getTime()) / 3600000;
    const existing = staffMap.get(a.userId);
    if (existing) {
      existing.totalHours += hours;
      existing.shiftCount++;
      if (a.shift.isPremium) {
        existing.premiumShifts++;
        existing.premiumHours += hours;
      }
    } else {
      staffMap.set(a.userId, {
        userId: a.userId,
        name: a.user.name,
        totalHours: hours,
        premiumShifts: a.shift.isPremium ? 1 : 0,
        premiumHours: a.shift.isPremium ? hours : 0,
        desiredHoursPerWeek: a.user.desiredHours?.hoursPerWeek ?? null,
        shiftCount: 1,
      });
    }
  }

  const staff = Array.from(staffMap.values()).sort((a, b) => b.totalHours - a.totalHours);

  // Fairness score: 1 - stddev(premiumCounts) / mean(premiumCounts)
  const counts = staff.map((s) => s.premiumShifts);
  const mean = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
  const stddev = counts.length > 1
    ? Math.sqrt(counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / counts.length)
    : 0;
  const fairnessScore = mean > 0 ? Math.max(0, Math.min(1, 1 - stddev / mean)) : null;

  return NextResponse.json({
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    weeks,
    staff,
    fairnessScore,
    mean: Math.round(mean * 10) / 10,
  });
}
