"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Clock } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface AvailWindow {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  createdAt: string;
}

interface AvailException {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  isUnavailable: boolean;
  createdAt: string;
}

interface AvailabilityData {
  windows: AvailWindow[];
  exceptions: AvailException[];
}

export function AvailabilityClient({
  initialWindows,
  initialExceptions,
  homeTimezone,
}: {
  initialWindows: AvailWindow[];
  initialExceptions: AvailException[];
  homeTimezone: string;
}) {
  const qc = useQueryClient();
  const { data } = useQuery<AvailabilityData>({
    queryKey: ["availability"],
    queryFn: async () => {
      const res = await fetch("/api/availability");
      if (!res.ok) throw new Error("Failed to load availability");
      return res.json();
    },
    initialData: { windows: initialWindows, exceptions: initialExceptions },
    staleTime: 30_000,
  });

  const windows = data?.windows ?? initialWindows;
  const exceptions = data?.exceptions ?? initialExceptions;

  const [newWindow, setNewWindow] = useState({ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" });
  const [newException, setNewException] = useState({ date: "", startTime: "09:00", endTime: "17:00", isUnavailable: false });
  const [showWindowForm, setShowWindowForm] = useState(false);
  const [showExceptionForm, setShowExceptionForm] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability"] });
      toast.success("Availability updated");
      setShowWindowForm(false);
      setShowExceptionForm(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: "window" | "exception" }) => {
      const res = await fetch(`/api/availability/${id}?type=${type}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Delete failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability"] });
      toast.success("Removed");
    },
    onError: () => toast.error("Failed to delete"),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* ── Left: Recurring Windows ── */}
      <div className="border border-border rounded-md overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 bg-card">
          <div>
            <h2 className="text-sm font-semibold">Recurring Availability</h2>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />{homeTimezone}
            </p>
          </div>
          {!showWindowForm && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowWindowForm(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add
            </Button>
          )}
        </div>

        <div className="divide-y divide-border">
          {windows.length === 0 && !showWindowForm && (
            <p className="px-4 py-4 text-sm text-muted-foreground">No recurring windows set.</p>
          )}
          {windows.map((w) => (
            <div key={w.id} className="px-4 py-3 flex items-center justify-between gap-3 bg-card">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[10px] w-9 justify-center font-medium">{DAYS[w.dayOfWeek]}</Badge>
                <span className="font-mono text-xs text-teal-400">{w.startTime} – {w.endTime}</span>
              </div>
              <Button
                variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ id: w.id, type: "window" })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {showWindowForm && (
            <div className="px-4 py-4 space-y-3 bg-card">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Day</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={newWindow.dayOfWeek}
                    onChange={(e) => setNewWindow({ ...newWindow, dayOfWeek: +e.target.value })}
                  >
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Start</label>
                  <Input type="time" className="h-9 font-mono" value={newWindow.startTime} onChange={(e) => setNewWindow({ ...newWindow, startTime: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">End</label>
                  <Input type="time" className="h-9 font-mono" value={newWindow.endTime} onChange={(e) => setNewWindow({ ...newWindow, endTime: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowWindowForm(false)}>Cancel</Button>
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={createMutation.isPending}
                  onClick={() => createMutation.mutate({ type: "window", ...newWindow })}>
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Time-off Exceptions ── */}
      <div className="border border-border rounded-md overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 bg-card">
          <div>
            <h2 className="text-sm font-semibold">Time-off Exceptions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">One-off unavailability or adjusted hours</p>
          </div>
          {!showExceptionForm && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowExceptionForm(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add
            </Button>
          )}
        </div>

        <div className="divide-y divide-border">
          {exceptions.length === 0 && !showExceptionForm && (
            <p className="px-4 py-4 text-sm text-muted-foreground">No exceptions scheduled.</p>
          )}
          {exceptions.map((e) => (
            <div key={e.id} className="px-4 py-3 flex items-center justify-between gap-3 bg-card">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium tabular-nums">{e.date}</span>
                {e.isUnavailable ? (
                  <Badge variant="outline" className="text-[10px] text-red-400 border-red-800/40">All day off</Badge>
                ) : (
                  <span className="font-mono text-xs text-teal-400">{e.startTime} – {e.endTime}</span>
                )}
              </div>
              <Button
                variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ id: e.id, type: "exception" })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {showExceptionForm && (
            <div className="px-4 py-4 space-y-3 bg-card">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                <Input type="date" className="h-9 max-w-[160px]" value={newException.date} onChange={(e) => setNewException({ ...newException, date: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox" id="fullDayOff"
                  checked={newException.isUnavailable}
                  onChange={(e) => setNewException({ ...newException, isUnavailable: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="fullDayOff" className="text-sm">Full day unavailable</label>
              </div>
              {!newException.isUnavailable && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Available from</label>
                    <Input type="time" className="h-9 font-mono" value={newException.startTime} onChange={(e) => setNewException({ ...newException, startTime: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Available until</label>
                    <Input type="time" className="h-9 font-mono" value={newException.endTime} onChange={(e) => setNewException({ ...newException, endTime: e.target.value })} />
                  </div>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowExceptionForm(false)}>Cancel</Button>
                <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={createMutation.isPending || !newException.date}
                  onClick={() => createMutation.mutate({
                    type: "exception",
                    date: newException.date,
                    isUnavailable: newException.isUnavailable,
                    startTime: newException.isUnavailable ? null : newException.startTime,
                    endTime: newException.isUnavailable ? null : newException.endTime,
                  })}>
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
