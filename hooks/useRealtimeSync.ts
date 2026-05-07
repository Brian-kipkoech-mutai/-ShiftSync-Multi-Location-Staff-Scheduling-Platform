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
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => {
        qc.invalidateQueries({ queryKey: ["notifications", userId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, qc]);
}
