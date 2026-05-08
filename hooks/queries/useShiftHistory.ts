"use client";

import { useQuery } from "@tanstack/react-query";

export interface ShiftHistoryEntry {
  id: string;
  entityType: string;
  action: string;
  performedByName: string;
  performedAt: string;
  reason: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export function useShiftHistory(shiftId: string, enabled: boolean) {
  return useQuery<ShiftHistoryEntry[]>({
    queryKey: ["shift-history", shiftId],
    queryFn: async () => {
      const res = await fetch(`/api/shifts/${shiftId}/history`);
      if (!res.ok) throw new Error("Failed to load shift history");
      return res.json();
    },
    enabled: !!shiftId && enabled,
    staleTime: 30_000,
  });
}
