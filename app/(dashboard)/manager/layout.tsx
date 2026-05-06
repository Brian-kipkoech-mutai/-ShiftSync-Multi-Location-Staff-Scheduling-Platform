import { requireRole } from "@/lib/auth";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { NotificationBell } from "@/components/layout/notification-bell";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["manager", "admin"]);

  return (
    <SidebarProvider>
      <SidebarNav role="manager" userName={user.name} userEmail={user.email} />
      <SidebarInset>
        <header className="h-14 shrink-0 border-b border-slate-200 bg-white flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <NotificationBell userId={user.id} />
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="max-w-screen-2xl mx-auto p-4 md:p-6">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
