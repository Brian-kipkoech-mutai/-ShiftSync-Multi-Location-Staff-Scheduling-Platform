import { requireRole } from "@/lib/auth";

export default async function ManagerSchedulePage() {
  await requireRole(["manager", "admin"]);
  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 mb-2">Schedule</h1>
      <p className="text-sm text-slate-500">Schedule view coming in Day 1 completion.</p>
    </div>
  );
}
