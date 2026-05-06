import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const user = await requireRole(["admin"]);

  const [locationCount, staffCount, shiftCount] = await Promise.all([
    prisma.location.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "staff", isActive: true } }),
    prisma.shift.count({ where: { status: "published" } }),
  ]);

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 mb-6">
        Overview — Coastal Eats
      </h1>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Active Locations" value={locationCount} />
        <StatCard label="Active Staff" value={staffCount} />
        <StatCard label="Published Shifts" value={shiftCount} />
      </div>
      <p className="text-sm text-slate-500">
        Welcome, {user.name}. Use the sidebar to navigate.
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-md border border-slate-200 p-4">
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}
