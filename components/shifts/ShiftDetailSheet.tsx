"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatRangeForLocation, formatDateForLocation } from "@/lib/timezone";
import { useDeleteShift } from "@/hooks/mutations/useShiftMutations";
import { useShiftHistory } from "@/hooks/queries/useShiftHistory";
import { ShiftFormModal } from "./ShiftFormModal";
import { AssignStaffModal } from "./AssignStaffModal";
import type { ShiftWithRelations } from "@/hooks/queries/useShifts";
import type { ShiftHistoryEntry } from "@/hooks/queries/useShiftHistory";

interface Location { id: string; name: string; timezone: string }
interface Skill { id: string; name: string }

interface Props {
  shift: ShiftWithRelations | null;
  onClose: () => void;
  locations: Location[];
  skills: Skill[];
  canManage: boolean;
}

export function ShiftDetailSheet({ shift, onClose, locations, skills, canManage }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const deleteShift = useDeleteShift();
  const { data: history = [], isLoading: historyLoading } = useShiftHistory(shift?.id ?? "", historyOpen && !!shift);

  const timeRange = shift ? formatRangeForLocation(new Date(shift.startUtc), new Date(shift.endUtc), shift.location.timezone) : "";
  const dateStr = shift ? formatDateForLocation(new Date(shift.startUtc), shift.location.timezone) : "";
  const isFull = shift ? shift.assignments.length >= shift.headcount : false;
  const isDraft = shift?.status === "draft";
  const isUnder = shift?.status === "published" && !!shift && shift.assignments.length < shift.headcount;

  async function handleDelete() {
    if (!shift || !confirm("Delete this draft shift?")) return;
    await deleteShift.mutateAsync(shift.id);
    onClose();
  }

  return (
    <>
      <Sheet open={!!shift} onOpenChange={(v) => !v && onClose()}>
        {shift && (
          <>
            <ShiftFormModal
              open={editOpen}
              onClose={() => setEditOpen(false)}
              shift={shift}
              locations={locations}
              skills={skills}
            />
            {assignOpen && (
              <AssignStaffModal
                open={assignOpen}
                onClose={() => setAssignOpen(false)}
                shift={shift}
              />
            )}
          </>
        )}
        <SheetContent className="w-80 sm:w-96 flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-base">Shift Details</SheetTitle>
          </SheetHeader>

          {shift && (
            <ScrollArea className="flex-1 overflow-hidden">
            <div className="grid auto-rows-min gap-6 px-4 pb-4">
              {/* Status badges */}
              <div className="flex gap-1.5 flex-wrap">
                <Badge variant={isDraft ? "secondary" : "default"} className={isDraft ? "" : "bg-teal-700 text-white border-0"}>
                  {shift.status}
                </Badge>
                {shift.isPremium && <Badge className="bg-amber-800/60 text-amber-300 border-0 text-[10px]">★ Premium</Badge>}
                {shift.isOvernight && <Badge variant="outline" className="text-[10px]">Overnight</Badge>}
                {isUnder && <Badge className="bg-red-900/60 text-red-300 border-0 text-[10px]">Under-staffed</Badge>}
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium">{shift.location.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="font-medium">{dateStr}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="font-mono">{timeRange}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Required Skill</p>
                  <p className="capitalize">{shift.requiredSkill.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Headcount</p>
                  <p className={isFull ? "text-teal-400" : isUnder ? "text-red-400" : ""}>
                    {shift.assignments.length} / {shift.headcount}
                  </p>
                </div>
              </div>

              {/* Assigned staff */}
              {shift.assignments.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Assigned Staff</p>
                  <div className="space-y-1">
                    {shift.assignments.map((a) => (
                      <div key={a.id} className="text-sm bg-card border border-border rounded-md px-2.5 py-1.5">
                        {a.user.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shift history */}
              {canManage && (
                <div>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setHistoryOpen((v) => !v)}
                  >
                    <span className={cn("inline-block transition-transform", historyOpen ? "rotate-90" : "")}>▶</span>
                    Shift History
                  </button>
                  {historyOpen && (
                    <ScrollArea className="mt-2 max-h-72 border-l border-border ml-1 pl-3">
                      {historyLoading && (
                        <p className="text-xs text-muted-foreground py-2">Loading…</p>
                      )}
                      {!historyLoading && history.length === 0 && (
                        <p className="text-xs text-muted-foreground py-2">No history yet.</p>
                      )}
                      {history.map((entry) => (
                        <HistoryEntry key={entry.id} entry={entry} />
                      ))}
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>
            </ScrollArea>
          )}

          {/* Manager actions */}
          {canManage && shift && (
            <SheetFooter>
              {!isFull && (
                <Button size="sm" className="w-full bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setAssignOpen(true)}>
                  Assign Staff ({shift.assignments.length}/{shift.headcount})
                </Button>
              )}
              <Button size="sm" variant="outline" className="w-full" onClick={() => setEditOpen(true)}>
                Edit Shift
              </Button>
              {isDraft && (
                <Button size="sm" variant="outline" className="w-full text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={handleDelete} disabled={deleteShift.isPending}>
                  Delete Draft
                </Button>
              )}
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

    </>
  );
}

// Keys to compare for shift edits, in display order
const SHIFT_EDIT_KEYS = ["startUtc", "endUtc", "requiredSkillId", "headcount"] as const;
type ShiftEditKey = (typeof SHIFT_EDIT_KEYS)[number];

const SHIFT_EDIT_LABEL: Record<ShiftEditKey, string> = {
  startUtc: "Start time",
  endUtc: "End time",
  requiredSkillId: "Required skill",
  headcount: "Headcount",
};

function getShiftEditChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): ShiftEditKey[] {
  return SHIFT_EDIT_KEYS.filter((k) => String(before[k]) !== String(after[k]));
}

function formatFieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if ((key === "startUtc" || key === "endUtc") && typeof value === "string") {
    return new Date(value).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }
  return String(value);
}

// For shift edits: only diff the four editable fields (avoids leaked relations/timestamps)
function diffShiftEdit(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): { key: string; before: string; after: string }[] {
  return SHIFT_EDIT_KEYS.filter((k) => String(before[k]) !== String(after[k])).map((k) => ({
    key: SHIFT_EDIT_LABEL[k],
    before: formatFieldValue(k, before[k]),
    after: formatFieldValue(k, after[k]),
  }));
}

function editColor(changes: ShiftEditKey[]): string {
  if (changes.includes("requiredSkillId")) return "text-amber-400";
  return "text-blue-400";
}

const ACTION_COLOR: Record<string, string> = {
  create: "text-teal-400",
  delete: "text-red-400",
  publish: "text-green-400",
  unpublish: "text-amber-400",
  remove: "text-red-400",
  override: "text-amber-400",
  "swap-approve": "text-teal-400",
  "swap-reject": "text-red-400",
};

function resolveEntry(entry: ShiftHistoryEntry): { label: string; color: string } {
  const staffName =
    (entry.after?.user as { name?: string } | undefined)?.name ??
    (entry.before?.user as { name?: string } | undefined)?.name;

  if (entry.entityType === "shift" && entry.action === "edit" && entry.before && entry.after) {
    const changes = getShiftEditChanges(entry.before, entry.after);
    const color = editColor(changes);
    if (changes.length === 0) return { label: "Shift edited", color: "text-blue-400" };
    if (changes.length === 1) return { label: `${SHIFT_EDIT_LABEL[changes[0]]} changed`, color };
    return {
      label: changes.map((k) => SHIFT_EDIT_LABEL[k]).join(" & ") + " changed",
      color,
    };
  }

  switch (entry.entityType) {
    case "shift":
      return {
        label: entry.action === "create" ? "Shift created"
          : entry.action === "publish" ? "Schedule published"
          : entry.action === "unpublish" ? "Schedule unpublished"
          : entry.action === "delete" ? "Shift deleted"
          : "Shift edited",
        color: ACTION_COLOR[entry.action] ?? "text-muted-foreground",
      };
    case "assignment":
      return {
        label: entry.action === "create" ? `${staffName ?? "Staff"} assigned`
          : entry.action === "remove" ? `${staffName ?? "Staff"} removed`
          : entry.action === "swap-approve" ? "Swap approved"
          : entry.action === "swap-reject" ? "Swap rejected"
          : `Assignment ${entry.action}`,
        color: ACTION_COLOR[entry.action] ?? "text-teal-400",
      };
    case "overtime_override":
      return { label: "Overtime override", color: "text-amber-400" };
    default:
      return { label: `${entry.entityType} ${entry.action}`, color: "text-muted-foreground" };
  }
}

function HistoryEntry({ entry }: { entry: ShiftHistoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const { label, color } = resolveEntry(entry);

  // Only shift edits have a meaningful diff to show
  const diffs =
    entry.entityType === "shift" && entry.action === "edit" && entry.before && entry.after
      ? diffShiftEdit(entry.before, entry.after)
      : null;
  const hasDiff = !!diffs && diffs.length > 0;

  return (
    <div className="py-2 border-b border-border/40 last:border-0">
      <div
        className={cn("flex items-start justify-between gap-2", hasDiff && "cursor-pointer")}
        onClick={() => hasDiff && setExpanded((v) => !v)}
      >
        <div className="min-w-0">
          <p className={cn("text-xs font-medium", color)}>{label}</p>
          <p className="text-[11px] text-muted-foreground">
            by {entry.performedByName} · {new Date(entry.performedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
          {entry.reason && <p className="text-[11px] text-amber-400 mt-0.5">Reason: {entry.reason}</p>}
        </div>
        {hasDiff && (
          <span className={cn("text-[10px] text-muted-foreground shrink-0 mt-0.5 transition-transform", expanded ? "rotate-90" : "")}>▶</span>
        )}
      </div>

      {expanded && diffs && (
        <div className="mt-1.5 bg-muted/20 rounded p-2 space-y-1">
          {diffs.map(({ key, before, after }) => (
            <div key={key} className="grid grid-cols-[6rem_1fr_1fr] gap-x-2 text-[10px]">
              <span className="text-muted-foreground/60 truncate">{key}</span>
              <span className="text-red-400/80 truncate font-mono">{before}</span>
              <span className="text-teal-400 truncate font-mono">{after}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
