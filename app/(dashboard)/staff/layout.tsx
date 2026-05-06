import { requireRole } from "@/lib/auth";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { NotificationBell } from "@/components/layout/notification-bell";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["staff"]);

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav role={user.role} userName={user.name} userEmail={user.email} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 shrink-0 border-b border-slate-200 bg-white flex items-center justify-end px-4">
          <NotificationBell userId={user.id} />
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-screen-2xl mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
