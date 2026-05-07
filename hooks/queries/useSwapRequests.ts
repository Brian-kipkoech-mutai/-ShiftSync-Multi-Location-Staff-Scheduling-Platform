"use client";

import { useQuery } from "@tanstack/react-query";

export interface SwapRequest {
  id: string;
  type: "swap" | "drop";
  status: string;
  createdAt: string;
  requester: { id: string; name: string };
  target?: { id: string; name: string } | null;
  claimer?: { id: string; name: string } | null;
  shiftAssignment: {
    id: string;
    shiftId: string;
    shift: {
      id: string;
      startUtc: string;
      endUtc: string;
      isPremium: boolean;
      isOvernight: boolean;
      location: { id: string; name: string; timezone: string };
      requiredSkill: { id: string; name: string };
    };
  };
}

export function useSwapRequests() {
  return useQuery<SwapRequest[]>({
    queryKey: ["swaps"],
    queryFn: async () => {
      const res = await fetch("/api/swaps");
      if (!res.ok) throw new Error("Failed to load swap requests");
      return res.json();
    },
    staleTime: 15_000,
  });
}
