"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp } from "lucide-react";

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const qc = useQueryClient();

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-staff"] }); toast.success("Certification updated"); },
    onError: (err: Error) => toast.error(err.message),
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-staff"] }); toast.success("User updated"); },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-3 max-w-3xl">
      <Input
        className="h-9 max-w-xs"
        placeholder="Search staff…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.map((u) => {
        const isExpanded = expandedId === u.id;
        const activeCerts = u.certifications.filter((c) => !c.revokedAt);
        const revokedCerts = u.certifications.filter((c) => c.revokedAt);
        const uncertifiedLocations = locations.filter((l) => !u.certifications.some((c) => c.locationId === l.id && !c.revokedAt));

        return (
          <div key={u.id} className="bg-card border border-border rounded-md overflow-hidden">
            <button
              className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors text-left"
              onClick={() => setExpandedId(isExpanded ? null : u.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                {!u.isActive && <Badge variant="outline" className="text-[10px] text-red-400 border-red-800/40">Inactive</Badge>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex gap-1 flex-wrap justify-end">
                  {u.skills.map((s) => (
                    <Badge key={s.id} variant="secondary" className="text-[10px] capitalize">{s.name}</Badge>
                  ))}
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                {/* Active certifications */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Active Certifications</p>
                  <div className="flex flex-wrap gap-2">
                    {activeCerts.map((c) => (
                      <div key={c.id} className="flex items-center gap-1.5 bg-teal-900/20 border border-teal-800/40 rounded px-2 py-1">
                        <span className="text-xs text-teal-300">{c.locationName}</span>
                        <button
                          className="text-muted-foreground hover:text-destructive transition-colors text-xs leading-none"
                          onClick={() => certMutation.mutate({ action: "revoke", userId: u.id, certId: c.id })}
                          disabled={certMutation.isPending}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {activeCerts.length === 0 && <p className="text-xs text-muted-foreground">None</p>}
                  </div>
                </div>

                {/* Grant certification */}
                {uncertifiedLocations.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Grant Certification</p>
                    <div className="flex flex-wrap gap-1.5">
                      {uncertifiedLocations.map((l) => (
                        <Button
                          key={l.id}
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={certMutation.isPending}
                          onClick={() => certMutation.mutate({ action: "grant", userId: u.id, locationId: l.id })}
                        >
                          + {l.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Revoked certifications */}
                {revokedCerts.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Revoked</p>
                    <div className="flex flex-wrap gap-1.5">
                      {revokedCerts.map((c) => (
                        <Badge key={c.id} variant="outline" className="text-[10px] text-muted-foreground">{c.locationName}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deactivate */}
                <div className="pt-1 border-t border-border flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className={u.isActive ? "text-destructive hover:text-destructive text-xs h-7" : "text-xs h-7"}
                    disabled={deactivateMutation.isPending}
                    onClick={() => deactivateMutation.mutate({ userId: u.id, isActive: !u.isActive })}
                  >
                    {u.isActive ? "Deactivate" : "Reactivate"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">No staff found.</p>
      )}
    </div>
  );
}
