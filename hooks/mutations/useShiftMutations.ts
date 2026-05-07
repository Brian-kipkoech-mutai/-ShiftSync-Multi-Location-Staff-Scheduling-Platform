"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ShiftFormData {
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  requiredSkillId: string;
  headcount: number;
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ShiftFormData) => {
      const res = await fetch("/api/shifts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed to create shift"); }
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shifts"] }); toast.success("Shift created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useEditShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ShiftFormData> & { id: string }) => {
      const res = await fetch(`/api/shifts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed to update shift"); }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["shifts"] });
      toast.success("Shift updated");
      if (data.disqualifiedAssignees?.length) {
        const names = (data.disqualifiedAssignees as { name: string }[]).map((a) => a.name).join(", ");
        toast.warning(`Skill mismatch — reassignment needed: ${names}`, { duration: 8000 });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/shifts/${id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed to delete shift"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shifts"] }); toast.success("Shift deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function usePublishWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (weekStart: string) => {
      const res = await fetch("/api/shifts/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekStart }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed to publish"); }
      return res.json();
    },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["shifts"] }); toast.success(`${data.published} shift${data.published !== 1 ? "s" : ""} published`); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUnpublishWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (weekStart: string) => {
      const res = await fetch("/api/shifts/unpublish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekStart }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed to unpublish"); }
      return res.json();
    },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["shifts"] }); toast.success(`${data.unpublished} shift${data.unpublished !== 1 ? "s" : ""} unpublished`); },
    onError: (e: Error) => toast.error(e.message),
  });
}
