import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ManagerSettingsClient } from "./ManagerSettingsClient";

export default async function ManagerSettingsPage() {
  const user = await requireRole(["manager", "admin"]);
  const notifPref = await prisma.notificationPreference.findUnique({ where: { userId: user.id } });

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-5">My Settings</h1>
      <ManagerSettingsClient
        name={user.name}
        email={user.email}
        emailSimulation={notifPref?.emailSimulation ?? true}
      />
    </div>
  );
}
