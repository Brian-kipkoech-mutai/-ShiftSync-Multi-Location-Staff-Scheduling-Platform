"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";

export function useRealtimeSync(userId: string) {
  const qc = useQueryClient();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("realtime-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "shifts" }, () => {
        qc.invalidateQueries({ queryKey: ["shifts"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "shift_assignments" }, () => {
        qc.invalidateQueries({ queryKey: ["shifts"] });
        qc.invalidateQueries({ queryKey: ["on-duty"] });
        qc.invalidateQueries({ queryKey: ["my-shifts"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "swap_requests" }, () => {
        qc.invalidateQueries({ queryKey: ["swaps"] });
        qc.invalidateQueries({ queryKey: ["my-shifts"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        qc.invalidateQueries({ queryKey: ["notifications", userId] });

        // On new notifications only: invalidate related query keys so pages refresh
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
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, qc]);
}
