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

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function NotificationBell({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const { data: notifications = [], isSuccess } = useQuery<Notification[]>({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to load notifications");
      return res.json();
    },
  });

  useEffect(() => {
    // Wait for the first real server response — avoids seeding on the default []
    if (!isSuccess) return;

    if (!initialized.current) {
      // Seed ALL current IDs silently — pre-existing notifications (read or unread) never toast
      notifications.forEach((n) => seenIds.current.add(n.id));
      initialized.current = true;
      return;
    }

    // Only fire for brand-new IDs that are still unread (realtime-pushed)
    notifications.forEach((n) => {
      if (!seenIds.current.has(n.id)) {
        seenIds.current.add(n.id);
        if (!n.read) {
          toast(n.title, { description: n.body, duration: 5000 });
          playNotificationChime();
        }
      }
    });
  }, [notifications, isSuccess]);

  const unread = notifications.filter((n) => !n.read).length;

  const markRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}/read`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to mark as read");
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["notifications", userId] });
      const previous = queryClient.getQueryData<Notification[]>(["notifications", userId]);
      queryClient.setQueryData<Notification[]>(["notifications", userId], (old) =>
        old?.map((n) => (n.id === notificationId ? { ...n, read: true } : n)) ?? []
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["notifications", userId], ctx.previous);
      toast.error("Failed to mark notification as read");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to mark all as read");
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications", userId] });
      const previous = queryClient.getQueryData<Notification[]>(["notifications", userId]);
      queryClient.setQueryData<Notification[]>(["notifications", userId], (old) =>
        old?.map((n) => ({ ...n, read: true })) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["notifications", userId], ctx.previous);
      toast.error("Failed to mark all notifications as read");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  // Derive loading state purely from mutation state — no local useState
  const isRowPending = (id: string) => markRead.isPending && markRead.variables === id;
  const allRowsBlocked = markAllRead.isPending;

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
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className={cn(
                "text-xs text-teal-400 flex items-center gap-1.5 transition-opacity select-none",
                markAllRead.isPending
                  ? "opacity-50 cursor-not-allowed pointer-events-none"
                  : "hover:underline"
              )}
            >
              {markAllRead.isPending ? (
                <>
                  <Spinner className="w-3 h-3" />
                  Marking…
                </>
              ) : (
                "Mark all read"
              )}
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No notifications</p>
          ) : (
            notifications.slice(0, 20).map((n) => {
              const rowPending = isRowPending(n.id);
              // allRowsBlocked disables individual clicks while mark-all is in flight
              // but does NOT disable mark-all while an individual is in flight (they run independently)
              const rowDisabled = allRowsBlocked || rowPending;

              return (
                <div
                  key={n.id}
                  onClick={() => {
                    if (rowDisabled || n.read) return;
                    markRead.mutate(n.id);
                  }}
                  className={cn(
                    "relative px-3 py-2.5 border-b border-border last:border-b-0 transition-colors",
                    n.read ? "cursor-default" : "bg-teal-950/30",
                    !n.read && !rowDisabled && "cursor-pointer hover:bg-accent",
                    rowDisabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  <p className={cn("text-sm pr-5", !n.read ? "font-medium text-foreground" : "text-foreground/80")}>
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                  {rowPending && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Spinner className="w-3.5 h-3.5 text-teal-400" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
