"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface Certification {
  locationName: string;
  timezone: string;
  grantedAt: string;
  revokedAt: string | null;
}

interface Props {
  name: string;
  email: string;
  homeTimezone: string;
  desiredHoursPerWeek: number | null;
  emailSimulation: boolean;
  certifications: Certification[];
}

export function SettingsClient({ name, email, homeTimezone, desiredHoursPerWeek, emailSimulation: initialEmailSimulation, certifications }: Props) {
  const [hours, setHours] = useState(desiredHoursPerWeek?.toString() ?? "");
  const [emailSim, setEmailSim] = useState(initialEmailSimulation);

  const saveMutation = useMutation({
    mutationFn: async (hoursPerWeek: number) => {
      const res = await fetch("/api/settings/desired-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hoursPerWeek }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => toast.success("Desired hours saved"),
    onError: (err: Error) => toast.error(err.message),
  });

  const prefMutation = useMutation({
    mutationFn: async (value: boolean) => {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailSimulation: value }),
      });
      if (!res.ok) throw new Error("Failed to save preference");
      return res.json();
    },
    onMutate: (value) => setEmailSim(value),
    onError: (err: Error, value) => {
      setEmailSim(!value);
      toast.error(err.message);
    },
  });

  return (
    <div className="space-y-8 max-w-md">
      {/* Profile info — read-only */}
      <div className="bg-card border border-border rounded-md p-4 space-y-3">
        <h2 className="text-sm font-semibold">Profile</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <span className="text-muted-foreground">Name</span>
          <span>{name}</span>
          <span className="text-muted-foreground">Email</span>
          <span className="truncate">{email}</span>
          <span className="text-muted-foreground">Home timezone</span>
          <span className="text-xs">{homeTimezone}</span>
        </div>
      </div>

      {/* Desired hours */}
      <div className="bg-card border border-border rounded-md p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Desired Hours</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Used in fairness analytics — does not restrict scheduling.</p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={0}
            max={80}
            step={0.5}
            className="h-9 w-24 font-mono"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="e.g. 32"
          />
          <span className="text-sm text-muted-foreground">hours / week</span>
        </div>
        <Button
          size="sm"
          className="bg-teal-600 hover:bg-teal-700 text-white"
          disabled={saveMutation.isPending || !hours}
          onClick={() => saveMutation.mutate(parseFloat(hours))}
        >
          {saveMutation.isPending ? "Saving…" : "Save"}
        </Button>
      </div>

      {/* Notification preferences */}
      <div className="bg-card border border-border rounded-md p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Notification Preferences</h2>
          <p className="text-xs text-muted-foreground mt-0.5">In-app notifications are always on.</p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Email simulation</p>
            <p className="text-xs text-muted-foreground">Receive email copies of notifications</p>
          </div>
          <Switch
            checked={emailSim}
            disabled={prefMutation.isPending}
            onCheckedChange={(val) => prefMutation.mutate(val)}
          />
        </div>
      </div>

      {/* Certifications */}
      <div className="bg-card border border-border rounded-md p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Location Certifications</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Managed by admin — contact your manager to add or remove certifications.</p>
        </div>
        <div className="space-y-2">
          {certifications.map((c) => (
            <div key={c.locationName + c.grantedAt} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm">{c.locationName}</p>
                <p className="text-xs text-muted-foreground">{c.timezone}</p>
              </div>
              {c.revokedAt ? (
                <Badge variant="outline" className="text-[10px] text-red-400 border-red-800/40">Revoked</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-teal-400 border-teal-800/40">Active</Badge>
              )}
            </div>
          ))}
          {certifications.length === 0 && (
            <p className="text-sm text-muted-foreground">No certifications on file.</p>
          )}
        </div>
      </div>
    </div>
  );
}
