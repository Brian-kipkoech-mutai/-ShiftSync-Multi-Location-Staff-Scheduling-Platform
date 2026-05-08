"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface Props {
  name: string;
  email: string;
  emailSimulation: boolean;
}

export function ManagerSettingsClient({ name, email, emailSimulation: initialEmailSimulation }: Props) {
  const [emailSim, setEmailSim] = useState(initialEmailSimulation);

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
    <div className="space-y-6 max-w-md">
      {/* Profile info — read-only */}
      <div className="bg-card border border-border rounded-md p-4 space-y-3">
        <h2 className="text-sm font-semibold">Profile</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <span className="text-muted-foreground">Name</span>
          <span>{name}</span>
          <span className="text-muted-foreground">Email</span>
          <span className="truncate">{email}</span>
        </div>
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
    </div>
  );
}
