import { prisma } from "./prisma";
import { AuditEntityType } from "@prisma/client";

interface AuditParams {
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  performedBy: string;
  reason?: string;
}

export async function logAudit({
  entityType,
  entityId,
  action,
  before,
  after,
  performedBy,
  reason,
}: AuditParams) {
  await prisma.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      beforeState: before !== undefined ? (before as object) : undefined,
      afterState: after !== undefined ? (after as object) : undefined,
      performedBy,
      reason,
    },
  });
}
