import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { FairnessClient } from "@/app/(dashboard)/manager/analytics/FairnessClient";

export default async function AdminAnalyticsPage() {
  await requireRole(["admin"]);

  const locations = await prisma.location.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const weeks = 4;
  const now = new Date();
  const rangeStart = startOfWeek(subWeeks(now, weeks), { weekStartsOn: 1 });
  const rangeEnd = endOfWeek(now, { weekStartsOn: 1 });

  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      status: "active",
      shift: { startUtc: { gte: rangeStart, lte: rangeEnd }, status: "published" },
    },
    include: {
      user: { select: { id: true, name: true, desiredHours: true } },
      shift: { select: { startUtc: true, endUtc: true, isPremium: true, location: { select: { id: true, name: true } } } },
    },
  });

  const staffMap = new Map<string, { userId: string; name: string; totalHours: number; premiumShifts: number; premiumHours: number; desiredHoursPerWeek: number | null; shiftCount: number }>();
  for (const a of assignments) {
    const hours = (new Date(a.shift.endUtc).getTime() - new Date(a.shift.startUtc).getTime()) / 3600000;
    const ex = staffMap.get(a.userId);
    if (ex) { ex.totalHours += hours; ex.shiftCount++; if (a.shift.isPremium) { ex.premiumShifts++; ex.premiumHours += hours; } }
    else { staffMap.set(a.userId, { userId: a.userId, name: a.user.name, totalHours: hours, premiumShifts: a.shift.isPremium ? 1 : 0, premiumHours: a.shift.isPremium ? hours : 0, desiredHoursPerWeek: a.user.desiredHours?.hoursPerWeek ?? null, shiftCount: 1 }); }
  }

  const staff = Array.from(staffMap.values()).sort((a, b) => b.totalHours - a.totalHours);
  const counts = staff.map((s) => s.premiumShifts);
  const mean = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
  const stddev = counts.length > 1 ? Math.sqrt(counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / counts.length) : 0;
  const fairnessScore = mean > 0 ? Math.max(0, Math.min(1, 1 - stddev / mean)) : null;

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-1">Fairness Analytics</h1>
      <p className="text-sm text-muted-foreground mb-5">Premium shift distribution across all locations</p>
      <FairnessClient
        initialStaff={staff}
        initialFairnessScore={fairnessScore}
        initialMean={Math.round(mean * 10) / 10}
        locations={locations}
        initialWeeks={weeks}
      />
    </div>
  );
}
