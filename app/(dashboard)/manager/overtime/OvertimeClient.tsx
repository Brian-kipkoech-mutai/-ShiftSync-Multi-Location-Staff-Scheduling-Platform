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

  return (
    <div className="space-y-4">
      <OvertimeBarChart staff={staff} />
      {staff.map((s) => {
        const badge = getStatusBadge(s.hours);
        const hoursFormatted = s.hours.toFixed(1);
        const desired = s.desiredHours;

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
              <div className="text-right shrink-0">
                <p className={cn(
                  "text-lg font-mono font-medium",
                  s.hours >= BLOCK_THRESHOLD ? "text-red-400" : s.hours >= WARNING_THRESHOLD ? "text-amber-400" : "text-foreground"
                )}>
                  {hoursFormatted}h
                </p>
                {desired != null && (
                  <p className="text-[10px] text-muted-foreground">/ {desired}h target</p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex gap-4 text-xs text-muted-foreground pt-2 px-1">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-500" /> Under 35h</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> 35–39h (warning)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> 40h+ (block)</span>
      </div>
    </div>
  );
}
