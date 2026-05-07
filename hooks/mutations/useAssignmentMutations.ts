"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useAssignStaff(shiftId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, overrideReason }: { userId: string; overrideReason?: string }) => {
      const res = await fetch(`/api/shifts/${shiftId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, overrideReason }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed to assign"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      qc.invalidateQueries({ queryKey: ["eligible-staff", shiftId] });
      toast.success("Staff assigned");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUnassignStaff(shiftId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await fetch(`/api/shifts/${shiftId}/assignments/${assignmentId}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed to remove"); }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Assignment removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
