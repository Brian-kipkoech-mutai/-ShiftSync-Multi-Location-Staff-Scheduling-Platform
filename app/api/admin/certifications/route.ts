import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// POST /api/admin/certifications — grant or revoke a location certification
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { action, userId, locationId, certId } = await request.json();

  if (action === "grant") {
    if (!userId || !locationId) return NextResponse.json({ error: "userId and locationId required" }, { status: 400 });

    const cert = await prisma.locationCertification.upsert({
      where: { userId_locationId: { userId, locationId } },
      create: { userId, locationId },
      update: { revokedAt: null },
    });
    await logAudit({ entityType: "certification", entityId: cert.id, action: "grant", after: cert, performedBy: user.id });
    return NextResponse.json(cert);
  }

  if (action === "revoke") {
    if (!certId) return NextResponse.json({ error: "certId required" }, { status: 400 });

    const cert = await prisma.locationCertification.findUnique({ where: { id: certId } });
    if (!cert) return NextResponse.json({ error: "Certification not found" }, { status: 404 });

    const updated = await prisma.locationCertification.update({
      where: { id: certId },
      data: { revokedAt: new Date() },
    });
    await logAudit({ entityType: "certification", entityId: certId, action: "revoke", before: cert, after: updated, performedBy: user.id });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "action must be 'grant' or 'revoke'" }, { status: 400 });
}
