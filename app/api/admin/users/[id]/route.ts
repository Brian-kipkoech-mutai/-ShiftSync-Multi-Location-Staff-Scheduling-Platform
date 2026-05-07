import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

// PATCH /api/admin/users/:id — update isActive or role
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getSessionUser();
  if (actor.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
      ...(body.role ? { role: body.role } : {}),
    },
  });

  await logAudit({
    entityType: "user",
    entityId: id,
    action: "update",
    before,
    after: updated,
    performedBy: actor.id,
  });

  return NextResponse.json(updated);
}
