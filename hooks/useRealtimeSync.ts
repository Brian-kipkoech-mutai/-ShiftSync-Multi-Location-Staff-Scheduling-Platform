"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useRealtimeSync(userId: string) {
  const qc = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    const channels: RealtimeChannel[] = [];
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;

      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }

      channels.push(
        supabase
          .channel("rt-shifts")
          .on("postgres_changes", { event: "*", schema: "public", table: "shifts" }, (payload) => {
            console.log("[RT] shifts:", payload.eventType);
            qc.invalidateQueries({ queryKey: ["shifts"] });
            const shiftId = (payload.new as { id?: string })?.id ?? (payload.old as { id?: string })?.id;
            if (shiftId) qc.invalidateQueries({ queryKey: ["shift-history", shiftId] });
          })
          .subscribe((s) => console.log("[RT] rt-shifts:", s)),

        supabase
          .channel("rt-assignments")
          .on("postgres_changes", { event: "*", schema: "public", table: "shift_assignments" }, (payload) => {
            console.log("[RT] shift_assignments:", payload.eventType);
            qc.invalidateQueries({ queryKey: ["shifts"] });
            qc.invalidateQueries({ queryKey: ["on-duty"] });
            qc.invalidateQueries({ queryKey: ["my-shifts"] });
            const shiftId = (payload.new as { shift_id?: string })?.shift_id ?? (payload.old as { shift_id?: string })?.shift_id;
            if (shiftId) qc.invalidateQueries({ queryKey: ["shift-history", shiftId] });
          })
          .subscribe((s) => console.log("[RT] rt-assignments:", s)),

        supabase
          .channel("rt-swaps")
          .on("postgres_changes", { event: "*", schema: "public", table: "swap_requests" }, (payload) => {
            console.log("[RT] swap_requests:", payload.eventType);
            qc.invalidateQueries({ queryKey: ["swaps"] });
            qc.invalidateQueries({ queryKey: ["my-shifts"] });
          })
          .subscribe((s) => console.log("[RT] rt-swaps:", s)),

        supabase
          .channel("rt-notifications")
          .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `userId=eq.${userId}` }, (payload) => {
            console.log("[RT] notifications:", payload.eventType, payload);
            qc.invalidateQueries({ queryKey: ["notifications", userId] });

            if (payload.eventType !== "INSERT") return;
            const type = (payload.new as { type?: string }).type;

            switch (type) {
              case "shift_assigned":
              case "shift_unassigned":
              case "shift_edited":
              case "shift_deleted":
              case "schedule_published":
              case "schedule_unpublished":
              case "skill_mismatch_warning":
                qc.invalidateQueries({ queryKey: ["shifts"] });
                qc.invalidateQueries({ queryKey: ["my-shifts"] });
                break;
              case "swap_request_created":
              case "swap_request_received":
              case "swap_awaiting_approval":
              case "drop_request_created":
              case "drop_awaiting_approval":
                qc.invalidateQueries({ queryKey: ["swaps"] });
                break;
              case "swap_accepted":
              case "swap_auto_cancelled":
              case "swap_cancelled":
              case "swap_rejected":
                qc.invalidateQueries({ queryKey: ["swaps"] });
                qc.invalidateQueries({ queryKey: ["my-shifts"] });
                break;
              case "swap_approved":
                qc.invalidateQueries({ queryKey: ["swaps"] });
                qc.invalidateQueries({ queryKey: ["my-shifts"] });
                qc.invalidateQueries({ queryKey: ["shifts"] });
                break;
              case "drop_available":
                qc.invalidateQueries({ queryKey: ["available-drops"] });
                break;
              case "drop_approved":
                qc.invalidateQueries({ queryKey: ["swaps"] });
                qc.invalidateQueries({ queryKey: ["available-drops"] });
                qc.invalidateQueries({ queryKey: ["my-shifts"] });
                qc.invalidateQueries({ queryKey: ["shifts"] });
                break;
              case "drop_rejected":
              case "drop_cancelled":
                qc.invalidateQueries({ queryKey: ["swaps"] });
                qc.invalidateQueries({ queryKey: ["available-drops"] });
                break;
              case "overtime_warning":
              case "overtime_override":
                qc.invalidateQueries({ queryKey: ["shifts"] });
                break;
              case "availability_changed":
                qc.invalidateQueries({ queryKey: ["staff"] });
                break;
            }
          })
          .subscribe((s) => console.log("[RT] rt-notifications:", s)),
      );
    });

    return () => {
      cancelled = true;
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [userId, qc]);
}
