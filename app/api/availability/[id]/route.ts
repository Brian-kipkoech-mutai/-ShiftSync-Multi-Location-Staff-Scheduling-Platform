import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

async function notifyManagersOfAvailabilityChange(staffId: string, staffName: string) {
  const certs = await prisma.locationCertification.findMany({
    where: { userId: staffId, revokedAt: null },
    select: { locationId: true },
  });
  const locationIds = certs.map((c) => c.locationId);
  if (locationIds.length === 0) return;
  const managers = await prisma.managerLocationAssignment.findMany({
    where: { locationId: { in: locationIds } },
    select: { managerId: true },
  });
  const uniqueManagerIds = [...new Set(managers.map((m) => m.managerId))];
  for (const managerId of uniqueManagerIds) {
    await notify(managerId, "availability_changed", "Staff availability updated", `${staffName} has updated their availability.`, { staffId });
  }
}

// DELETE /api/availability/:id?type=window|exception
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  const { id } = await params;
  const type = new URL(request.url).searchParams.get("type");

  if (type === "window") {
    const w = await prisma.availabilityWindow.findUnique({ where: { id } });
    if (!w || w.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.availabilityWindow.delete({ where: { id } });
    await logAudit({ entityType: "availability", entityId: id, action: "delete", before: w, performedBy: user.id });
    await notifyManagersOfAvailabilityChange(user.id, user.name);
    return new NextResponse(null, { status: 204 });
  }

  if (type === "exception") {
    const e = await prisma.availabilityException.findUnique({ where: { id } });
    if (!e || e.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.availabilityException.delete({ where: { id } });
    await logAudit({ entityType: "availability", entityId: id, action: "delete", before: e, performedBy: user.id });
    await notifyManagersOfAvailabilityChange(user.id, user.name);
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({ error: "type param required" }, { status: 400 });
}
