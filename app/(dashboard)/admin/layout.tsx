import { requireRole } from "@/lib/auth";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { NotificationBell } from "@/components/layout/notification-bell";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { RealtimeProvider } from "@/components/layout/RealtimeProvider";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["admin"]);

  return (
    <SidebarProvider>
      <SidebarNav role={user.role} userName={user.name} userEmail={user.email} />
      <SidebarInset>
        <header className="h-14 shrink-0 border-b border-border bg-background flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <NotificationBell userId={user.id} />
        </header>
        <RealtimeProvider userId={user.id} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-screen-2xl mx-auto p-4 md:p-6">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
