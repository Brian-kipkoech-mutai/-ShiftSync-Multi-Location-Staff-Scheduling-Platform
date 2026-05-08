"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  Radio,
  Users,
  MapPin,
  BarChart3,
  ScrollText,
  Mail,
  Settings,
  ArrowLeftRight,
  Clock,
  CalendarPlus,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const adminNav: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Schedule", href: "/admin/schedule", icon: CalendarDays },
  { label: "On Duty", href: "/admin/on-duty", icon: Radio },
  { label: "Staff", href: "/admin/staff", icon: Users },
  { label: "Locations", href: "/admin/locations", icon: MapPin },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Audit Log", href: "/admin/audit", icon: ScrollText },
  { label: "Simulated Emails", href: "/admin/simulated-emails", icon: Mail },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

const managerNav: NavItem[] = [
  { label: "Schedule", href: "/manager", icon: CalendarDays },
  { label: "On Duty", href: "/manager/on-duty", icon: Radio },
  { label: "Swap Requests", href: "/manager/swaps", icon: ArrowLeftRight },
  { label: "Analytics", href: "/manager/analytics", icon: BarChart3 },
  { label: "Overtime", href: "/manager/overtime", icon: Clock },
  { label: "Staff", href: "/manager/staff", icon: Users },
  { label: "Settings", href: "/manager/settings", icon: Settings },
];

const staffNav: NavItem[] = [
  { label: "My Schedule", href: "/staff", icon: CalendarDays },
  { label: "Available Shifts", href: "/staff/available", icon: CalendarPlus },
  { label: "My Swaps", href: "/staff/swaps", icon: ArrowLeftRight },
  { label: "Availability", href: "/staff/availability", icon: Clock },
  { label: "Settings", href: "/staff/settings", icon: Settings },
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
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#" className="flex items-center gap-2">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-teal-600 text-white">
                  <CalendarRange className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-sidebar-foreground">ShiftSync</span>
                  <span className="text-xs text-sidebar-foreground/50 capitalize">{role}</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin" &&
                    item.href !== "/manager" &&
                    item.href !== "/staff" &&
                    pathname.startsWith(item.href + "/"));

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "rounded-sm",
                        isActive && "bg-teal-900/40 text-teal-400 font-medium hover:bg-teal-900/60 hover:text-teal-300"
                      )}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="text-[11px] bg-teal-900/50 text-teal-400">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{userName}</p>
            <p className="text-[11px] text-sidebar-foreground/50 truncate">{userEmail}</p>
          </div>
          <LogoutButton />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
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
      title="Sign out"
      className="shrink-0 text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors p-1 rounded-sm hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    </button>
  );
}
