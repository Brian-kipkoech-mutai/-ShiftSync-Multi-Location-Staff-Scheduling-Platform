import { useQuery } from "@tanstack/react-query";

export interface ShiftWithRelations {
  id: string;
  locationId: string;
  startUtc: string;
  endUtc: string;
  requiredSkillId: string;
  headcount: number;
  status: "draft" | "published";
  isOvernight: boolean;
  isPremium: boolean;
  location: { id: string; name: string; timezone: string };
  requiredSkill: { id: string; name: string };
  assignments: Array<{
    id: string;
    userId: string;
    user: { id: string; name: string };
  }>;
}

export function useShifts(weekStart: Date, locationIds: string[] = []) {
  const weekParam = weekStart.toISOString().split("T")[0];
  const locationParams = locationIds.map((id) => `locationId=${id}`).join("&");
  const url = `/api/shifts?week=${weekParam}${locationParams ? "&" + locationParams : ""}`;

  return useQuery<ShiftWithRelations[]>({
    queryKey: ["shifts", weekParam, locationIds],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load shifts");
      return res.json();
    },
    staleTime: 30 * 1000,
  });
}
