"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

export function AdminSettingsClient({ settings: initialSettings }: { settings: Setting[] }) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(initialSettings.map((s) => [s.key, s.value]))
  );
  const qc = useQueryClient();

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
