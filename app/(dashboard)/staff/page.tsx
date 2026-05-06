import { requireRole } from "@/lib/auth";

export default async function StaffSchedulePage() {
  await requireRole(["staff"]);
  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 mb-2">My Schedule</h1>
      <p className="text-sm text-slate-500">Your upcoming shifts will appear here.</p>
    </div>
  );
}
