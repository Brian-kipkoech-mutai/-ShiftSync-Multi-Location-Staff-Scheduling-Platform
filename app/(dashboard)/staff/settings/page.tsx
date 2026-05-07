import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./SettingsClient";

export default async function StaffSettingsPage() {
  const user = await requireRole(["staff"]);

  const [desiredHours, certs] = await Promise.all([
    prisma.desiredHours.findUnique({ where: { userId: user.id } }),
    prisma.locationCertification.findMany({
      where: { userId: user.id },
      include: { location: true },
      orderBy: { grantedAt: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-5">My Settings</h1>
      <SettingsClient
        name={user.name}
        email={user.email}
        homeTimezone={user.homeTimezone}
        desiredHoursPerWeek={desiredHours?.hoursPerWeek ?? null}
        certifications={certs.map((c) => ({
          locationName: c.location.name,
          timezone: c.location.timezone,
          revokedAt: c.revokedAt?.toISOString() ?? null,
          grantedAt: c.grantedAt.toISOString(),
        }))}
      />
    </div>
  );
}
