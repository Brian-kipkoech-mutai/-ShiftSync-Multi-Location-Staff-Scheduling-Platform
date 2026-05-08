"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, Cell } from "recharts";
import { cn } from "@/lib/utils";

interface StaffHours {
  userId: string;
  name: string;
  hours: number;
  desiredHours: number | null;
  shiftCount: number;
}

const WARNING_THRESHOLD = 35;
const BLOCK_THRESHOLD = 40;
const BASE_RATE = 20;
const OT_RATE = BASE_RATE * 1.5;

function computeCost(hours: number) {
  const regular = Math.min(hours, 40);
  const overtime = Math.max(hours - 40, 0);
  return { regular, overtime, total: regular * BASE_RATE + overtime * OT_RATE };
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function getStatusBadge(hours: number) {
  if (hours >= BLOCK_THRESHOLD) return { label: "Over 40h", className: "bg-red-900/60 text-red-300 border-0" };
  if (hours >= WARNING_THRESHOLD) return { label: "Warning 35h+", className: "bg-amber-900/60 text-amber-300 border-0" };
  return null;
}

const overtimeChartConfig = {
  hours: { label: "Hours this week" },
} satisfies ChartConfig;

function OvertimeBarChart({ staff }: { staff: StaffHours[] }) {
  const data = staff.map((s) => ({ name: s.name.split(" ")[0], fullName: s.name, hours: s.hours }));
  const barColor = (hours: number) =>
    hours >= BLOCK_THRESHOLD ? "#ef4444" : hours >= WARNING_THRESHOLD ? "#f59e0b" : "#14b8a6";

  return (
    <div className="bg-card border border-border rounded-md p-4">
      <p className="text-xs font-medium text-muted-foreground mb-3">Weekly hours — current week</p>
      <ChartContainer config={overtimeChartConfig} className="w-full" style={{ height: Math.max(180, data.length * 36) }}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }} barCategoryGap="30%">
          <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeOpacity={0.4} />
          <XAxis type="number" domain={[0, 48]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={52} />
          <ChartTooltip
            content={<ChartTooltipContent
              formatter={(value, _, props) => [`${Number(value).toFixed(1)}h`, props.payload?.fullName ?? ""]}
            />}
          />
          <ReferenceLine x={WARNING_THRESHOLD} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.7} label={{ value: "35h", position: "top", fontSize: 9, fill: "#f59e0b" }} />
          <ReferenceLine x={BLOCK_THRESHOLD} stroke="#ef4444" strokeDasharray="4 3" strokeOpacity={0.7} label={{ value: "40h", position: "top", fontSize: 9, fill: "#ef4444" }} />
          <Bar dataKey="hours" radius={[0, 3, 3, 0]} maxBarSize={20}>
            {data.map((d, i) => <Cell key={i} fill={barColor(d.hours)} />)}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}

function HoursBar({ hours }: { hours: number }) {
  const pct = Math.min((hours / 48) * 100, 100);
  const color = hours >= BLOCK_THRESHOLD ? "bg-red-500" : hours >= WARNING_THRESHOLD ? "bg-amber-500" : "bg-teal-500";
  return (
    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-1.5">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function OvertimeClient({ staff: initialStaff, weekStartISO }: { staff: StaffHours[]; weekStartISO: string }) {
  const { data } = useQuery<{ staff: StaffHours[] }>({
    queryKey: ["overtime", weekStartISO],
    queryFn: async () => {
      const res = await fetch(`/api/overtime?weekStart=${weekStartISO}`);
      if (!res.ok) throw new Error("Failed to load overtime data");
      return res.json();
    },
    initialData: { staff: initialStaff },
    staleTime: 60_000,
  });

  const staff = data?.staff ?? initialStaff;

  if (staff.length === 0) {
    return <p className="text-sm text-muted-foreground">No published shifts this week.</p>;
  }

  const totalCost = staff.reduce((sum, s) => sum + computeCost(s.hours).total, 0);
  const totalOtCost = staff.reduce((sum, s) => sum + computeCost(s.hours).overtime * OT_RATE, 0);
  const totalOtHours = staff.reduce((sum, s) => sum + Math.max(s.hours - 40, 0), 0);

  return (
    <div className="space-y-4">
      {/* Cost summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-md p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Total projected cost</p>
          <p className="text-xl font-mono font-semibold">{fmt(totalCost)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">@ ${BASE_RATE}/h base</p>
        </div>
        <div className={cn("border rounded-md p-3 text-center", totalOtHours > 0 ? "bg-red-950/30 border-red-900/50" : "bg-card border-border")}>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Overtime premium</p>
          <p className={cn("text-xl font-mono font-semibold", totalOtHours > 0 ? "text-red-400" : "text-foreground")}>
            {fmt(totalOtCost)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{totalOtHours.toFixed(1)}h @ ${OT_RATE}/h</p>
        </div>
        <div className="bg-card border border-border rounded-md p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Staff scheduled</p>
          <p className="text-xl font-mono font-semibold">{staff.length}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{staff.filter(s => s.hours >= BLOCK_THRESHOLD).length} in overtime</p>
        </div>
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-500" /> Under 35h</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> 35–39h (warning)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> 40h+ (block)</span>
      </div>
      <OvertimeBarChart staff={staff} />
      {staff.map((s) => {
        const badge = getStatusBadge(s.hours);
        const hoursFormatted = s.hours.toFixed(1);
        const desired = s.desiredHours;
        const cost = computeCost(s.hours);

        return (
          <div key={s.userId} className="bg-card border border-border rounded-md p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{s.name}</p>
                  {badge && <Badge className={cn("text-[10px]", badge.className)}>{badge.label}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.shiftCount} shift{s.shiftCount !== 1 ? "s" : ""}
                  {desired != null && ` · target ${desired}h`}
                </p>
                <HoursBar hours={s.hours} />
              </div>
              <div className="text-right shrink-0 space-y-0.5">
                <p className={cn(
                  "text-lg font-mono font-medium leading-tight",
                  s.hours >= BLOCK_THRESHOLD ? "text-red-400" : s.hours >= WARNING_THRESHOLD ? "text-amber-400" : "text-foreground"
                )}>
                  {hoursFormatted}h
                </p>
                <p className="text-xs font-mono text-muted-foreground">{fmt(cost.total)}</p>
                {cost.overtime > 0 && (
                  <p className="text-[10px] font-mono text-red-400">+{fmt(cost.overtime * OT_RATE)} OT</p>
                )}
                {desired != null && (
                  <p className="text-[10px] text-muted-foreground">target {desired}h</p>
                )}
              </div>
            </div>
          </div>
        );
      })}

    </div>
  );
}
