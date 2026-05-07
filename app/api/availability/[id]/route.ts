import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

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
    return new NextResponse(null, { status: 204 });
  }

  if (type === "exception") {
    const e = await prisma.availabilityException.findUnique({ where: { id } });
    if (!e || e.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.availabilityException.delete({ where: { id } });
    await logAudit({ entityType: "availability", entityId: id, action: "delete", before: e, performedBy: user.id });
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({ error: "type param required" }, { status: 400 });
}
