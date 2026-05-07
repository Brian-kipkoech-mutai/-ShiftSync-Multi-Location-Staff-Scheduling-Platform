"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useCreateSwap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { assignmentId: string; type: "swap" | "drop"; targetUserId?: string }) => {
      const res = await fetch("/api/swaps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed to create request"); }
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["swaps"] });
      qc.invalidateQueries({ queryKey: ["my-shifts"] });
      toast.success(vars.type === "drop" ? "Drop request submitted" : "Swap request sent");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSwapAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: string; reason?: string }) => {
      const res = await fetch(`/api/swaps/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Action failed"); }
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["swaps"] });
      qc.invalidateQueries({ queryKey: ["shifts"] });
      qc.invalidateQueries({ queryKey: ["my-shifts"] });
      const messages: Record<string, string> = {
        accept: "Swap accepted",
        claim: "Shift claimed",
        approve: "Request approved",
        reject: "Request rejected",
        cancel: "Request cancelled",
      };
      toast.success(messages[vars.action] ?? "Done");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
