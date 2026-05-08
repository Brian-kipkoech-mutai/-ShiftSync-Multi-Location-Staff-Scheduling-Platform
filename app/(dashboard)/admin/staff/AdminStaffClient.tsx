"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Clock, Users, Search } from "lucide-react";

interface StaffUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  homeTimezone: string;
  desiredHours: number | null;
  skills: { id: string; name: string }[];
  certifications: { id: string; locationId: string; locationName: string; revokedAt: string | null }[];
}

interface Props {
  users: StaffUser[];
  locations: { id: string; name: string }[];
  skills: { id: string; name: string }[];
}

export function AdminStaffClient({ users: initialUsers, locations, skills }: Props) {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const router = useRouter();

  const filtered = initialUsers.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const certMutation = useMutation({
    mutationFn: async ({ action, userId, locationId, certId }: { action: "grant" | "revoke"; userId: string; locationId?: string; certId?: string }) => {
      const res = await fetch("/api/admin/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId, locationId, certId }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => toast.success("Certification updated"),
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin-staff"] });
      router.refresh();
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => toast.success("User updated"),
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin-staff"] });
      router.refresh();
    },
  });

  return (
    <div className="space-y-6">
      {/* Centered search — grows on lg */}
      <div className="flex flex-col items-center gap-1">
        <div className="relative w-full max-w-sm lg:max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 h-9 lg:h-10 lg:text-sm"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {filtered.length} of {initialUsers.length} staff
        </p>
      </div>

      {/* Card grid — 1 col on mobile, 2 on md, 3 on lg */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((u) => {
          const activeCerts = u.certifications.filter((c) => !c.revokedAt);
          const revokedCerts = u.certifications.filter((c) => c.revokedAt);
          const uncertifiedLocations = locations.filter(
            (l) => !u.certifications.some((c) => c.locationId === l.id && !c.revokedAt)
          );

          return (
            <div
              key={u.id}
              className={`bg-card border rounded-md flex flex-col ${u.isActive ? "border-border" : "border-border opacity-60"}`}
            >
              {/* Card header */}
              <div className="px-4 pt-4 pb-3 border-b border-border">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-[10px] ${u.isActive ? "text-teal-400 border-teal-700/50" : "text-red-400 border-red-800/40"}`}
                  >
                    {u.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {u.homeTimezone.replace("America/", "")}
                  </span>
                  {u.desiredHours !== null && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {u.desiredHours}h/wk desired
                    </span>
                  )}
                </div>
              </div>

              {/* Card body */}
              <div className="px-4 py-3 space-y-3 flex-1">
                {/* Skills */}
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {u.skills.length > 0
                      ? u.skills.map((s) => (
                          <Badge key={s.id} variant="secondary" className="text-[10px] capitalize">{s.name}</Badge>
                        ))
                      : <span className="text-xs text-muted-foreground">—</span>
                    }
                  </div>
                </div>

                {/* Active certifications */}
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />Certified Locations</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeCerts.map((c) => (
                      <div key={c.id} className="flex items-center gap-1 bg-teal-900/20 border border-teal-800/40 rounded px-2 py-0.5">
                        <span className="text-[11px] text-teal-300 font-medium">{c.locationName}</span>
                        <button
                          type="button"
                          className="text-teal-600 hover:text-destructive transition-colors leading-none ml-0.5"
                          title="Revoke certification"
                          onClick={() => certMutation.mutate({ action: "revoke", userId: u.id, certId: c.id })}
                          disabled={certMutation.isPending}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {activeCerts.length === 0 && (
                      <span className="text-xs text-muted-foreground">No active certifications</span>
                    )}
                  </div>
                </div>

                {/* Grant certification */}
                {uncertifiedLocations.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Grant Access</p>
                    <div className="flex flex-wrap gap-1">
                      {uncertifiedLocations.map((l) => (
                        <Button
                          key={l.id}
                          variant="outline"
                          size="sm"
                          className="h-6 text-[11px] px-2"
                          disabled={certMutation.isPending}
                          onClick={() => certMutation.mutate({ action: "grant", userId: u.id, locationId: l.id })}
                        >
                          + {l.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Revoked */}
                {revokedCerts.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Revoked</p>
                    <div className="flex flex-wrap gap-1">
                      {revokedCerts.map((c) => (
                        <Badge key={c.id} variant="outline" className="text-[10px] text-muted-foreground line-through">{c.locationName}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card footer */}
              <div className="px-4 py-2.5 border-t border-border flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className={`text-xs h-7 ${u.isActive ? "text-destructive hover:text-destructive hover:border-destructive/50" : ""}`}
                  disabled={deactivateMutation.isPending}
                  onClick={() => deactivateMutation.mutate({ userId: u.id, isActive: !u.isActive })}
                >
                  {u.isActive ? "Deactivate" : "Reactivate"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">No staff found.</p>
      )}
    </div>
  );
}
