import { prisma } from "./prisma";
import { Role } from "@prisma/client";

export interface UserScope {
  userId: string;
  role: Role;
  locationIds: string[]; // empty means all locations (admin)
}

export async function getUserScope(userId: string): Promise<UserScope> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId, isActive: true },
    select: {
      id: true,
      role: true,
      managerAssignments: { select: { locationId: true } },
    },
  });

  if (user.role === "admin") {
    return { userId, role: "admin", locationIds: [] };
  }

  if (user.role === "manager") {
    return {
      userId,
      role: "manager",
      locationIds: user.managerAssignments.map((a) => a.locationId),
    };
  }

  // staff — scope to their certified (non-revoked) locations
  const certs = await prisma.locationCertification.findMany({
    where: { userId, revokedAt: null },
    select: { locationId: true },
  });

  return {
    userId,
    role: "staff",
    locationIds: certs.map((c) => c.locationId),
  };
}

export async function assertCanAccessLocation(
  userId: string,
  locationId: string
): Promise<void> {
  const scope = await getUserScope(userId);
  if (scope.role === "admin") return;
  if (!scope.locationIds.includes(locationId)) {
    throw new Error(
      `Access denied: user ${userId} cannot access location ${locationId}`
    );
  }
}

export function buildLocationFilter(scope: UserScope) {
  if (scope.role === "admin") return {};
  return { locationId: { in: scope.locationIds } };
}
