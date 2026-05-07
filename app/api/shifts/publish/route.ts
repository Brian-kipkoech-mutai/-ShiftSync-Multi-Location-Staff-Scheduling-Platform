import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserScope, buildLocationFilter } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (user.role === "staff") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const scope = await getUserScope(user.id);

  const { weekStart } = await request.json();
  if (!weekStart) return NextResponse.json({ error: "weekStart required" }, { status: 400 });

  const start = new Date(weekStart);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);

  const locationFilter = buildLocationFilter(scope);

  const shifts = await prisma.shift.findMany({
    where: { ...locationFilter, status: "draft", startUtc: { gte: start, lt: end } },
    include: { assignments: { where: { status: "active" } }, location: true },
  });

  if (shifts.length === 0) return NextResponse.json({ published: 0 });

  await prisma.shift.updateMany({
    where: { id: { in: shifts.map((s) => s.id) } },
    data: { status: "published" },
  });

  const notified = new Set<string>();
  for (const shift of shifts) {
    await logAudit({ entityType: "shift", entityId: shift.id, action: "publish", before: { status: "draft" }, after: { status: "published" }, performedBy: user.id });
    for (const a of shift.assignments) {
      if (!notified.has(a.userId)) {
        await notify(a.userId, "schedule_published", "Schedule published", `Your schedule for the week of ${start.toLocaleDateString()} has been published.`, { weekStart });
        notified.add(a.userId);
      }
    }
  }

  return NextResponse.json({ published: shifts.length });
}
