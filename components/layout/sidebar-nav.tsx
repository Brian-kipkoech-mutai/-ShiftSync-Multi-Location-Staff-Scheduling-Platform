"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

interface NavItem {
  label: string;
  href: string;
  icon?: string;
}

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Schedule", href: "/admin/schedule" },
  { label: "On Duty", href: "/admin/on-duty" },
  { label: "Staff", href: "/admin/staff" },
  { label: "Locations", href: "/admin/locations" },
  { label: "Analytics", href: "/admin/analytics" },
  { label: "Audit Log", href: "/admin/audit" },
  { label: "Simulated Emails", href: "/admin/simulated-emails" },
  { label: "Settings", href: "/admin/settings" },
];

const managerNav: NavItem[] = [
  { label: "Schedule", href: "/manager" },
  { label: "On Duty", href: "/manager/on-duty" },
  { label: "Assign Staff", href: "/manager/assign" },
  { label: "Swap Requests", href: "/manager/swaps" },
  { label: "Analytics", href: "/manager/analytics" },
  { label: "Overtime", href: "/manager/overtime" },
  { label: "Staff", href: "/manager/staff" },
];

const staffNav: NavItem[] = [
  { label: "My Schedule", href: "/staff" },
  { label: "Available Shifts", href: "/staff/available" },
  { label: "My Swaps", href: "/staff/swaps" },
  { label: "Availability", href: "/staff/availability" },
  { label: "Settings", href: "/staff/settings" },
];

const navByRole: Record<Role, NavItem[]> = {
  admin: adminNav,
  manager: managerNav,
  staff: staffNav,
};

interface SidebarNavProps {
  role: Role;
  userName: string;
  userEmail: string;
}

export function SidebarNav({ role, userName, userEmail }: SidebarNavProps) {
  const pathname = usePathname();
  const items = navByRole[role];

  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white flex flex-col h-full">
      <div className="h-14 flex items-center px-4 border-b border-slate-200">
        <span className="font-semibold text-[#0F6E56] text-sm tracking-tight">
          ShiftSync
        </span>
        <span className="ml-2 text-xs text-slate-400 capitalize">{role}</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center h-9 px-4 text-sm rounded-none transition-colors",
                isActive
                  ? "bg-teal-50 text-[#0F6E56] font-medium"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <p className="text-xs font-medium text-slate-700 truncate">{userName}</p>
        <p className="text-xs text-slate-400 truncate">{userEmail}</p>
        <LogoutButton />
      </div>
    </aside>
  );
}

function LogoutButton() {
  async function handleLogout() {
    const { createClient } = await import("@/lib/supabase");
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleLogout}
      className="mt-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
    >
      Sign out
    </button>
  );
}
