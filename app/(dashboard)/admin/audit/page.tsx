import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuditLogClient } from "./AuditLogClient";

export default async function AuditLogPage() {
  await requireRole(["admin"]);

  const logs = await prisma.auditLog.findMany({
    include: { performer: { select: { name: true } } },
    orderBy: { performedAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-5">Audit Log</h1>
      <AuditLogClient
        logs={logs.map((l) => ({
          id: l.id,
          entityType: l.entityType,
          entityId: l.entityId,
          action: l.action,
          performedBy: l.performer?.name ?? "system",
          performedAt: l.performedAt.toISOString(),
          reason: l.reason ?? null,
          before: l.beforeState as object | null,
          after: l.afterState as object | null,
        }))}
      />
    </div>
  );
}
