import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AvailabilityClient } from "./AvailabilityClient";

export default async function AvailabilityPage() {
  const user = await requireRole(["staff"]);

  const [windows, exceptions] = await Promise.all([
    prisma.availabilityWindow.findMany({
      where: { userId: user.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.availabilityException.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-1">My Availability</h1>
      <p className="text-sm text-muted-foreground mb-5">Set your recurring weekly schedule and time-off exceptions</p>
      <AvailabilityClient
        initialWindows={windows.map((w) => ({ ...w, createdAt: w.createdAt.toISOString() }))}
        initialExceptions={exceptions.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }))}
        homeTimezone={user.homeTimezone}
      />
    </div>
  );
}
