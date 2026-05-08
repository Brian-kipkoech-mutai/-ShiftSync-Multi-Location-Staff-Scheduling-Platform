import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserScope } from "@/lib/scope";
import { Badge } from "@/components/ui/badge";

export default async function ManagerStaffPage() {
  const user = await requireRole(["manager", "admin"]);
  const scope = await getUserScope(user.id);
  const locationIds = scope.role === "admin" ? undefined : scope.locationIds;

  const staff = await prisma.user.findMany({
    where: {
      role: "staff",
      isActive: true,
      locationCertifications: {
        some: {
          revokedAt: null,
          ...(locationIds ? { locationId: { in: locationIds } } : {}),
        },
      },
    },
    include: {
      skills: { include: { skill: true } },
      locationCertifications: {
        where: { revokedAt: null, ...(locationIds ? { locationId: { in: locationIds } } : {}) },
        include: { location: { select: { name: true } } },
      },
      desiredHours: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-5">Staff at My Locations</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {staff.map((s) => (
          <div key={s.id} className="bg-card border border-border rounded-md p-4 flex flex-col gap-3">
            <div>
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.email}</p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {s.skills.map((sk) => (
                <Badge key={sk.skillId} variant="secondary" className="text-[10px] capitalize">{sk.skill.name}</Badge>
              ))}
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-border">
              <div className="flex flex-wrap gap-1">
                {s.locationCertifications.map((c) => (
                  <span key={c.id} className="text-[10px] text-teal-400">{c.location.name}</span>
                ))}
              </div>
              {s.desiredHours && (
                <span className="text-[10px] text-muted-foreground shrink-0">{s.desiredHours.hoursPerWeek}h/wk</span>
              )}
            </div>
          </div>
        ))}
        {staff.length === 0 && <p className="text-sm text-muted-foreground col-span-full">No active staff at your locations.</p>}
      </div>
    </div>
  );
}
