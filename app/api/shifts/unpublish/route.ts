import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserScope, buildLocationFilter } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { addHours } from "date-fns";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (user.role === "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const scope = await getUserScope(user.id);

  const { weekStart } = await request.json();
  if (!weekStart) return NextResponse.json({ error: "weekStart required" }, { status: 400 });

  const start = new Date(weekStart);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);

  const cutoffSetting = await prisma.systemSettings.findUnique({ where: { key: "edit_cutoff_hours" } });
  const cutoffHours = cutoffSetting ? parseInt(cutoffSetting.value) : 48;
  const locationFilter = buildLocationFilter(scope);

  // Block if any shift in the week is past the edit cutoff
  const tooLate = await prisma.shift.findFirst({
    where: { ...locationFilter, status: "published", startUtc: { gte: start, lt: end, lte: addHours(new Date(), cutoffHours) } },
  });
  if (tooLate) {
    return NextResponse.json({ error: `Cannot unpublish — one or more shifts start within ${cutoffHours}h.` }, { status: 409 });
  }

  const shifts = await prisma.shift.findMany({
    where: { ...locationFilter, status: "published", startUtc: { gte: start, lt: end } },
    include: { assignments: { where: { status: "active" } }, location: true },
  });

  if (shifts.length === 0) return NextResponse.json({ unpublished: 0 });

  await prisma.shift.updateMany({
    where: { id: { in: shifts.map((s) => s.id) } },
    data: { status: "draft" },
  });

  const notified = new Set<string>();
  for (const shift of shifts) {
    await logAudit({ entityType: "shift", entityId: shift.id, action: "unpublish", before: { status: "published" }, after: { status: "draft" }, performedBy: user.id });
    for (const a of shift.assignments) {
      if (!notified.has(a.userId)) {
        await notify(a.userId, "schedule_unpublished", "Schedule unpublished", `The schedule for the week of ${start.toLocaleDateString()} has been unpublished.`, { weekStart });
        notified.add(a.userId);
      }
    }
  }

  return NextResponse.json({ unpublished: shifts.length });
}
