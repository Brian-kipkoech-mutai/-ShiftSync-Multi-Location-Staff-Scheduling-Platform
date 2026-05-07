"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  performedAt: string;
  reason: string | null;
  before: object | null;
  after: object | null;
}

const ACTION_COLOR: Record<string, string> = {
  create: "text-teal-400 border-teal-800/40",
  update: "text-blue-400 border-blue-800/40",
  delete: "text-red-400 border-red-800/40",
  grant: "text-teal-400 border-teal-800/40",
  revoke: "text-amber-400 border-amber-800/40",
  approve: "text-teal-400 border-teal-800/40",
  reject: "text-red-400 border-red-800/40",
  cancel: "text-muted-foreground",
  publish: "text-green-400 border-green-800/40",
  unpublish: "text-amber-400 border-amber-800/40",
};

export function AuditLogClient({ logs }: { logs: AuditEntry[] }) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = logs.filter(
    (l) =>
      l.entityType.includes(search.toLowerCase()) ||
      l.action.includes(search.toLowerCase()) ||
      l.performedBy.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3 max-w-4xl">
      <div className="flex items-center gap-2">
        <Input
          className="h-9 max-w-xs"
          placeholder="Filter by type, action, user…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <a
          href="/api/admin/audit/export"
          className="shrink-0 text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          Export CSV
        </a>
      </div>

      <div className="space-y-1.5">
        {filtered.map((log) => (
          <div
            key={log.id}
            className="bg-card border border-border rounded-md px-3 py-2.5 cursor-pointer hover:bg-muted/10 transition-colors"
            onClick={() => setExpanded(expanded === log.id ? null : log.id)}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn("text-[10px] capitalize", ACTION_COLOR[log.action] ?? "")}>
                {log.action}
              </Badge>
              <span className="text-xs text-muted-foreground capitalize">{log.entityType.replace(/_/g, " ")}</span>
              <span className="text-xs text-foreground/70">by {log.performedBy}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {new Date(log.performedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {log.reason && (
              <p className="text-xs text-amber-400 mt-1">Reason: {log.reason}</p>
            )}
            {expanded === log.id && (
              <div className="mt-2 pt-2 border-t border-border grid grid-cols-2 gap-2">
                {log.before && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Before</p>
                    <pre className="text-[10px] text-muted-foreground bg-muted/20 rounded p-2 overflow-auto max-h-40">
                      {JSON.stringify(log.before, null, 2)}
                    </pre>
                  </div>
                )}
                {log.after && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">After</p>
                    <pre className="text-[10px] text-muted-foreground bg-muted/20 rounded p-2 overflow-auto max-h-40">
                      {JSON.stringify(log.after, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No matching log entries.</p>}
      </div>
    </div>
  );
}
