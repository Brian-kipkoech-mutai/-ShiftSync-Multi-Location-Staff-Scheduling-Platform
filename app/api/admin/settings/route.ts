import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// PUT /api/admin/settings — upsert a system setting
export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { key, value } = await request.json();
  if (!key || value === undefined) return NextResponse.json({ error: "key and value required" }, { status: 400 });

  const before = await prisma.systemSettings.findUnique({ where: { key } });

  const setting = await prisma.systemSettings.upsert({
    where: { key },
    create: { key, value, updatedBy: user.id },
    update: { value, updatedBy: user.id },
  });

  await logAudit({
    entityType: "system_settings",
    entityId: key,
    action: "update",
    before: before ?? undefined,
    after: setting,
    performedBy: user.id,
  });

  return NextResponse.json(setting);
}
