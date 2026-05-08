"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface StaffFairness {
  userId: string;
  name: string;
  totalHours: number;
  premiumShifts: number;
  premiumHours: number;
  desiredHoursPerWeek: number | null;
  shiftCount: number;
}

interface Props {
  initialStaff: StaffFairness[];
  initialFairnessScore: number | null;
  initialMean: number;
  locations: { id: string; name: string }[];
  initialWeeks: number;
}

function FairnessScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-sm text-muted-foreground">—</span>;
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? "text-teal-400" : pct >= 60 ? "text-amber-400" : "text-red-400";
  return (
    <span className={cn("text-2xl font-mono font-semibold", color)}>
      {pct}<span className="text-base font-normal text-muted-foreground">%</span>
    </span>
  );
}

function StaffRowSkeleton() {
  return (
    <div className="bg-card border border-border rounded-md px-3 py-3 space-y-2 animate-pulse">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
        <div className="h-3.5 bg-muted rounded w-28" />
        <div className="h-3.5 bg-muted rounded w-10" />
        <div className="h-3.5 bg-muted rounded w-6" />
        <div className="h-3.5 bg-muted rounded w-12" />
      </div>
      <div className="h-1 bg-muted rounded-full" />
      <div className="h-1 bg-muted rounded-full" />
    </div>
  );
}

export function FairnessClient({ initialStaff, initialFairnessScore, initialMean, locations, initialWeeks }: Props) {
  const [weeks, setWeeks] = useState(initialWeeks);
  const [locationId, setLocationId] = useState<string>("all");

  const isInitialCombo = weeks === initialWeeks && locationId === "all";
  const { data, isFetching } = useQuery<{ staff: StaffFairness[]; fairnessScore: number | null; mean: number }>({
    queryKey: ["fairness", weeks, locationId],
    queryFn: async () => {
      const params = new URLSearchParams({ weeks: String(weeks) });
      if (locationId !== "all") params.set("locationId", locationId);
      const res = await fetch(`/api/analytics/fairness?${params}`);
      if (!res.ok) throw new Error("Failed to load analytics");
      return res.json();
    },
    initialData: isInitialCombo
      ? { staff: initialStaff, fairnessScore: initialFairnessScore, mean: initialMean }
      : undefined,
    initialDataUpdatedAt: 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const staff = data?.staff ?? [];
  const fairnessScore = data?.fairnessScore ?? null;
  const mean = data?.mean ?? 0;
  const maxPremium = Math.max(...(staff.length ? staff.map((s) => s.premiumShifts) : [1]), 1);
  const maxHours = Math.max(...(staff.length ? staff.map((s) => s.totalHours) : [1]), 1);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {[2, 4, 8].map((w) => (
            <button
              key={w}
              onClick={() => setWeeks(w)}
              className={cn(
                "px-3 py-1 rounded text-xs border transition-colors",
                weeks === w
                  ? "bg-teal-900/40 border-teal-800/40 text-teal-400"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {w}w
            </button>
          ))}
        </div>
        <Select value={locationId} onValueChange={setLocationId}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Fairness score card */}
      <div className="bg-card border border-border rounded-md p-4 flex items-center gap-6">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Fairness Score</p>
          {isFetching ? (
            <div className="h-7 w-16 bg-muted rounded animate-pulse" />
          ) : (
            <FairnessScoreBadge score={fairnessScore} />
          )}
        </div>
        <div className="border-l border-border pl-6">
          <p className="text-xs text-muted-foreground mb-0.5">Avg premium shifts/person</p>
          {isFetching ? (
            <div className="h-6 w-8 bg-muted rounded animate-pulse" />
          ) : (
            <p className="text-xl font-mono font-medium">{mean}</p>
          )}
        </div>
        <div className="border-l border-border pl-6 flex-1 hidden sm:block">
          <p className="text-xs text-muted-foreground">
            Score = 1 − (std dev ÷ mean) of premium shift counts.{" "}
            <strong className="text-foreground">100% = perfectly equal</strong> distribution.
            Scores below 60% indicate significant imbalance.
          </p>
        </div>
      </div>

      {/* Staff table */}
      {isFetching ? (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
            <span>Staff Member</span>
            <span className="text-right">Total hrs</span>
            <span className="text-right">Premium</span>
            <span className="text-right">Target</span>
          </div>
          {[...Array(staff.length || 5)].map((_, i) => (
            <StaffRowSkeleton key={i} />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <p className="text-sm text-muted-foreground">No published shifts in this period.</p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
            <span>Staff Member</span>
            <span className="text-right">Total hrs</span>
            <span className="text-right">Premium</span>
            <span className="text-right">Target</span>
          </div>
          {staff.map((s) => (
            <div key={s.userId} className="bg-card border border-border rounded-md px-3 py-3 space-y-2">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
                <p className="text-sm font-medium">{s.name}</p>
                <span className="text-sm font-mono text-right">{s.totalHours.toFixed(1)}h</span>
                <div className="text-right">
                  {s.premiumShifts > 0 ? (
                    <Badge className="text-[10px] bg-amber-800/60 text-amber-300 border-0">★ {s.premiumShifts}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">0</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground text-right">
                  {s.desiredHoursPerWeek != null ? `${s.desiredHoursPerWeek}h/wk` : "—"}
                </span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${(s.premiumShifts / maxPremium) * 100}%` }}
                />
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full"
                  style={{ width: `${(s.totalHours / maxHours) * 100}%` }}
                />
              </div>
            </div>
          ))}
          <div className="flex gap-4 text-xs text-muted-foreground px-1 pt-1">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Premium shifts</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-500" /> Total hours</span>
          </div>
        </div>
      )}
    </div>
  );
}
