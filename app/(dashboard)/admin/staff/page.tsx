import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminStaffClient } from "./AdminStaffClient";

export default async function AdminStaffPage() {
  await requireRole(["admin"]);

  const [users, locations, skills] = await Promise.all([
    prisma.user.findMany({
      where: { role: "staff" },
      include: {
        skills: { include: { skill: true } },
        locationCertifications: { include: { location: true }, orderBy: { grantedAt: "asc" } },
        desiredHours: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.skill.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="w-full">
      <h1 className="text-lg font-semibold text-foreground mb-5">Staff Management</h1>
      <AdminStaffClient
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          isActive: u.isActive,
          homeTimezone: u.homeTimezone,
          desiredHours: u.desiredHours?.hoursPerWeek ?? null,
          skills: u.skills.map((s) => ({ id: s.skillId, name: s.skill.name })),
          certifications: u.locationCertifications.map((c) => ({
            id: c.id,
            locationId: c.locationId,
            locationName: c.location.name,
            revokedAt: c.revokedAt?.toISOString() ?? null,
          })),
        }))}
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        skills={skills.map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}
