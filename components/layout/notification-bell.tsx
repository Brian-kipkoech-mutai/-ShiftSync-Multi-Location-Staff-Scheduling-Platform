"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { playNotificationChime } from "@/lib/chime";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export function NotificationBell({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to load notifications");
      return res.json();
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!initialized.current) {
      // Seed seen IDs on first load — don't toast for pre-existing notifications
      notifications.forEach((n) => seenIds.current.add(n.id));
      initialized.current = true;
      return;
    }

    // On every subsequent refetch (polling or realtime), toast any new notification
    notifications.forEach((n) => {
      if (!seenIds.current.has(n.id)) {
        seenIds.current.add(n.id);
        toast(n.title, { description: n.body, duration: 5000 });
        playNotificationChime();
      }
    });
  }, [notifications]);

  const unread = notifications.filter((n) => !n.read).length;

  const markRead = useMutation({
    mutationFn: async (notificationId: string) => {
      await fetch(`/api/notifications/${notificationId}/read`, { method: "PATCH" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", userId] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", userId] }),
  });

  return (
    <Popover>
      <PopoverTrigger className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 p-0 flex items-center justify-center text-[10px] bg-red-500 border-0">
            {unread > 9 ? "9+" : unread}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-md" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-medium">Notifications</span>
          {unread > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-xs text-teal-400 hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No notifications</p>
          ) : (
            notifications.slice(0, 20).map((n) => (
              <div
                key={n.id}
                onClick={() => !n.read && markRead.mutate(n.id)}
                className={cn(
                  "px-3 py-2.5 border-b border-border cursor-pointer hover:bg-accent transition-colors",
                  !n.read && "bg-teal-950/30"
                )}
              >
                <p className={cn("text-sm", !n.read ? "font-medium text-foreground" : "text-foreground/80")}>
                  {n.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
