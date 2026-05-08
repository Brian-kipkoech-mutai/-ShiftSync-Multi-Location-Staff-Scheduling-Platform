"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface Setting {
  key: string;
  value: string;
  updatedAt: string;
}

const SETTING_DESCRIPTIONS: Record<string, string> = {
  edit_cutoff_hours: "Hours before shift start when editing/unpublishing is no longer allowed",
  premium_start_hour: "Hour of day (24h) when premium shift calculation begins (e.g. 17 = 5pm)",
  premium_end_hour: "Hour of day (24h) when premium calculation ends (e.g. 24 = midnight)",
};

export function AdminSettingsClient({ settings: initialSettings, emailSimulation: initialEmailSimulation }: { settings: Setting[]; emailSimulation: boolean }) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(initialSettings.map((s) => [s.key, s.value]))
  );
  const [emailSim, setEmailSim] = useState(initialEmailSimulation);
  const qc = useQueryClient();

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

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (_, { key }) => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success(`${key} updated`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4 max-w-md">
      {/* Personal notification preferences */}
      <div className="bg-card border border-border rounded-md p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">My Notification Preferences</h2>
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

      <p className="text-xs text-muted-foreground pt-2 font-semibold uppercase tracking-wide">System Configuration</p>

      {initialSettings.map((s) => (
        <div key={s.key} className="bg-card border border-border rounded-md p-4 space-y-2">
          <div>
            <p className="text-sm font-medium font-mono">{s.key}</p>
            {SETTING_DESCRIPTIONS[s.key] && (
              <p className="text-xs text-muted-foreground mt-0.5">{SETTING_DESCRIPTIONS[s.key]}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Input
              className="h-9 w-28 font-mono"
              value={values[s.key] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [s.key]: e.target.value }))}
            />
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white h-9"
              disabled={saveMutation.isPending || values[s.key] === s.value}
              onClick={() => saveMutation.mutate({ key: s.key, value: values[s.key] })}
            >
              Save
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Last updated {new Date(s.updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      ))}
    </div>
  );
}
