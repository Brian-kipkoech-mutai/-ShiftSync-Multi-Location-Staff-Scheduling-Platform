"use client";

import { useQuery } from "@tanstack/react-query";

export interface EligibleStaffMember {
  id: string;
  name: string;
  email: string;
  skills: string[];
  weeklyHours: number;
  dailyHours: number;
  shiftHours: number;
  homeLocation: string;
  violations: { rule: string; message: string; severity: "block" | "override" | "warning" }[];
  canAssign: boolean;
  needsOverride: boolean;
}

export function useEligibleStaff(shiftId: string, enabled = true) {
  return useQuery<EligibleStaffMember[]>({
    queryKey: ["eligible-staff", shiftId],
    queryFn: async () => {
      const res = await fetch(`/api/shifts/${shiftId}/assignments`);
      if (!res.ok) throw new Error("Failed to load eligible staff");
      return res.json();
    },
    enabled: !!shiftId && enabled,
    staleTime: 10_000,
  });
}
