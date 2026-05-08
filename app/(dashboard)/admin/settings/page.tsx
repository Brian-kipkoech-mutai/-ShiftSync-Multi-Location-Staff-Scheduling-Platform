import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminSettingsClient } from "./AdminSettingsClient";

export default async function AdminSettingsPage() {
  const user = await requireRole(["admin"]);

  const [settings, notifPref] = await Promise.all([
    prisma.systemSettings.findMany({ orderBy: { key: "asc" } }),
    prisma.notificationPreference.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <div>
      <h1 className="text-lg font-semibold text-foreground mb-1">System Settings</h1>
      <p className="text-sm text-muted-foreground mb-5">Configure platform-wide behavior</p>
      <AdminSettingsClient
        settings={settings.map((s) => ({ key: s.key, value: s.value, updatedAt: s.updatedAt.toISOString() }))}
        emailSimulation={notifPref?.emailSimulation ?? true}
      />
    </div>
  );
}
