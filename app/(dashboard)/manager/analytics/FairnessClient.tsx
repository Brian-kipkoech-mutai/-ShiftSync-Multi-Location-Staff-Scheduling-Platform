"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { PieChart, Pie, Cell, Label, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
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

const CHART_COLORS = [
  "var(--color-teal-500, #14b8a6)",
  "var(--color-amber-500, #f59e0b)",
  "var(--color-sky-500, #0ea5e9)",
  "var(--color-violet-500, #8b5cf6)",
  "var(--color-rose-500, #f43f5e)",
  "var(--color-emerald-500, #10b981)",
  "var(--color-orange-500, #f97316)",
  "var(--color-cyan-500, #06b6d4)",
  "var(--color-pink-500, #ec4899)",
  "var(--color-lime-500, #84cc16)",
];

function PremiumDonutChart({ staff, fairnessScore }: { staff: StaffFairness[]; fairnessScore: number | null }) {
  const hasData = staff.some((s) => s.premiumShifts > 0);
  const data = hasData
    ? staff.filter((s) => s.premiumShifts > 0).map((s, i) => ({
        name: s.name.split(" ")[0],
        value: s.premiumShifts,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      }))
    : [{ name: "No data", value: 1, fill: "hsl(var(--muted))" }];

  const chartConfig = Object.fromEntries(
    data.map((d) => [d.name, { label: d.name, color: d.fill }])
  ) satisfies ChartConfig;

  const scorePct = fairnessScore !== null ? Math.round(fairnessScore * 100) : null;
  const scoreColor = scorePct === null ? "text-muted-foreground" : scorePct >= 80 ? "text-teal-400" : scorePct >= 60 ? "text-amber-400" : "text-red-400";

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-3">Premium Shift Distribution</p>
      <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-52">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={80} paddingAngle={2}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                const { cx, cy } = viewBox as { cx: number; cy: number };
                return (
                  <text textAnchor="middle" dominantBaseline="middle">
                    <tspan
                      x={cx} y={cy - 8}
                      className={cn("fill-current text-2xl font-semibold font-mono", scoreColor)}
                      style={{ fontSize: 22 }}
                    >
                      {scorePct !== null ? `${scorePct}%` : "—"}
                    </tspan>
                    <tspan
                      x={cx} y={cy + 14}
                      style={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    >
                      fairness
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      {hasData && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
          {data.map((d, i) => (
            <span key={i} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
              {d.name} ({d.value})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function HoursBarChart({ staff, weeks }: { staff: StaffFairness[]; weeks: number }) {
  const data = staff.map((s) => ({
    name: s.name.split(" ")[0],
    actual: Math.round(s.totalHours * 10) / 10,
    target: s.desiredHoursPerWeek != null ? Math.round(s.desiredHoursPerWeek * weeks * 10) / 10 : null,
  }));

  const chartConfig = {
    actual: { label: "Actual hours", color: "#14b8a6" },
    target: { label: "Target hours", color: "#f59e0b" },
  } satisfies ChartConfig;

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-3">Hours — Actual vs Target</p>
      <ChartContainer config={chartConfig} className="max-h-52 w-full">
        <BarChart data={data} barCategoryGap="30%" barGap={2}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="actual" fill="#14b8a6" radius={[3, 3, 0, 0]} maxBarSize={24} />
          <Bar dataKey="target" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={24} fillOpacity={0.5} />
        </BarChart>
      </ChartContainer>
      <div className="flex gap-4 text-[10px] text-muted-foreground justify-center mt-2">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500" />Actual</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 opacity-50" />Target</span>
      </div>
    </div>
  );
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

      {/* Charts */}
      {!isFetching && staff.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-md p-4">
            <PremiumDonutChart staff={staff} fairnessScore={fairnessScore} />
          </div>
          <div className="bg-card border border-border rounded-md p-4">
            <HoursBarChart staff={staff} weeks={weeks} />
          </div>
        </div>
      )}
      {isFetching && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-md p-4 h-64 animate-pulse" />
          <div className="bg-card border border-border rounded-md p-4 h-64 animate-pulse" />
        </div>
      )}

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
