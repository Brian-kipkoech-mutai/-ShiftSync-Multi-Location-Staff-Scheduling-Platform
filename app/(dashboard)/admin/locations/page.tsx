import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminLocationsPage() {
  await requireRole(["admin"]);

  const locations = await prisma.location.findMany({
    include: {
      _count: {
        select: {
          certifications: { where: { revokedAt: null } },
          shifts: { where: { status: "published" } },
        },
      },
      managerAssignments: { include: { manager: { select: { name: true } } } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-5">Locations</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
        {locations.map((loc) => (
          <div key={loc.id} className="bg-card border border-border rounded-md p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{loc.name}</p>
                <p className="text-xs text-muted-foreground">{loc.timezone}</p>
              </div>
              {!loc.isActive && (
                <span className="text-[10px] text-red-400 border border-red-800/40 rounded px-1.5 py-0.5">Inactive</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-muted-foreground">Certified staff</span>
              <span>{loc._count.certifications}</span>
              <span className="text-muted-foreground">Published shifts</span>
              <span>{loc._count.shifts}</span>
            </div>
            {loc.managerAssignments.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Managers</p>
                <div className="flex flex-wrap gap-1">
                  {loc.managerAssignments.map((a) => (
                    <span key={a.managerId} className="text-xs bg-muted/30 rounded px-1.5 py-0.5">{a.manager.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
