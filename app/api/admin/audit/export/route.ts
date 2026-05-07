import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/audit/export?from=YYYY-MM-DD&to=YYYY-MM-DD&locationId=...&action=...
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (user.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const action = searchParams.get("action");

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(from ? { performedAt: { gte: new Date(from) } } : {}),
      ...(to ? { performedAt: { lte: new Date(to + "T23:59:59Z") } } : {}),
      ...(action ? { action } : {}),
    },
    include: { performer: { select: { name: true, email: true } } },
    orderBy: { performedAt: "desc" },
    take: 5000,
  });

  const rows = [
    ["id", "entityType", "entityId", "action", "performedBy", "performedAt", "reason"].join(","),
    ...logs.map((l) =>
      [
        l.id,
        l.entityType,
        l.entityId,
        l.action,
        `"${l.performer?.name ?? "system"}"`,
        l.performedAt.toISOString(),
        `"${l.reason ?? ""}"`,
      ].join(",")
    ),
  ].join("\n");

  return new NextResponse(rows, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
