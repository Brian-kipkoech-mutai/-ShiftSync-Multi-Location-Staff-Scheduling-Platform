"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCreateShift, useEditShift } from "@/hooks/mutations/useShiftMutations";
import type { ShiftWithRelations } from "@/hooks/queries/useShifts";

interface Location { id: string; name: string; timezone: string }
interface Skill { id: string; name: string }

interface Props {
  open: boolean;
  onClose: () => void;
  shift?: ShiftWithRelations | null;
  defaultDate?: Date;
  locations: Location[];
  skills: Skill[];
}

const schema = z.object({
  locationId: z.string().min(1, "Location required"),
  date: z.string().min(1, "Date required"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  requiredSkillId: z.string().min(1, "Skill required"),
  headcount: z.number().int().min(1).max(20),
});
type FormValues = z.infer<typeof schema>;

interface UnassignPreview {
  id: string;
  name: string;
  reason: string;
}

export function ShiftFormModal({ open, onClose, shift, defaultDate, locations, skills }: Props) {
  const isEdit = !!shift;
  const createShift = useCreateShift();
  const editShift = useEditShift();
  const [pendingConfirm, setPendingConfirm] = useState<{ wouldUnassign: UnassignPreview[]; values: FormValues } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const isPending = createShift.isPending || editShift.isPending || isPreviewing;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { locationId: "", date: "", startTime: "09:00", endTime: "17:00", requiredSkillId: "", headcount: 1 },
  });

  useEffect(() => {
    if (!open) {
      setPendingConfirm(null);
      return;
    }
    if (shift) {
      const tz = shift.location.timezone;
      const startZoned = toZonedTime(new Date(shift.startUtc), tz);
      const endZoned = toZonedTime(new Date(shift.endUtc), tz);
      form.reset({
        locationId: shift.locationId,
        date: format(startZoned, "yyyy-MM-dd"),
        startTime: format(startZoned, "HH:mm"),
        endTime: format(endZoned, "HH:mm"),
        requiredSkillId: shift.requiredSkillId,
        headcount: shift.headcount,
      });
    } else {
      form.reset({
        locationId: locations[0]?.id ?? "",
        date: defaultDate ? format(defaultDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        startTime: "09:00",
        endTime: "17:00",
        requiredSkillId: skills[0]?.id ?? "",
        headcount: 1,
      });
    }
  }, [open, shift, defaultDate, locations, skills, form]);

  async function onSubmit(values: FormValues) {
    if (isEdit && shift) {
      setIsPreviewing(true);
      try {
        const res = await fetch(`/api/shifts/${shift.id}?preview=true`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.wouldUnassign?.length > 0) {
            setPendingConfirm({ wouldUnassign: data.wouldUnassign, values });
            return;
          }
        }
      } finally {
        setIsPreviewing(false);
      }
      await editShift.mutateAsync({ id: shift.id, ...values });
      onClose();
    } else {
      await createShift.mutateAsync(values);
      onClose();
    }
  }

  async function handleConfirmedSave() {
    if (!shift || !pendingConfirm) return;
    await editShift.mutateAsync({ id: shift.id, ...pendingConfirm.values });
    setPendingConfirm(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pendingConfirm ? "Confirm Changes" : isEdit ? "Edit Shift" : "New Shift"}</DialogTitle>
        </DialogHeader>

        {pendingConfirm ? (
          <div className="space-y-4">
            <div className="rounded-md bg-amber-950/40 border border-amber-800/50 p-3 space-y-2">
              <p className="text-sm font-medium text-amber-400">This change will unassign the following staff:</p>
              <ul className="space-y-1.5 mt-1">
                {pendingConfirm.wouldUnassign.map((s) => (
                  <li key={s.id} className="text-xs leading-snug">
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="text-muted-foreground ml-1.5">— {s.reason}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground pt-1 border-t border-amber-800/30 mt-2">
                They will be notified and the shift will need to be re-staffed.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPendingConfirm(null)}>
                Go back
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={editShift.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleConfirmedSave}
              >
                {editShift.isPending ? "Saving…" : "Save & unassign"}
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="locationId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEdit}>
                    <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select location" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <DatePickerInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="startTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start</FormLabel>
                    <FormControl><Input type="time" className="h-9 font-mono" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="endTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel>End</FormLabel>
                    <FormControl><Input type="time" className="h-9 font-mono" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              {(() => {
                const start = form.watch("startTime");
                const end = form.watch("endTime");
                const [sh, sm] = start.split(":").map(Number);
                const [eh, em] = end.split(":").map(Number);
                if (eh * 60 + em < sh * 60 + sm) {
                  return <p className="text-xs text-amber-400">Overnight shift — ends next day (+1)</p>;
                }
                return null;
              })()}

              <FormField control={form.control} name="requiredSkillId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Required Skill</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select skill" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {skills.map((s) => <SelectItem key={s.id} value={s.id} className="capitalize">{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="headcount" render={({ field }) => (
                <FormItem>
                  <FormLabel>Headcount</FormLabel>
                  <FormControl><Input type="number" min={1} max={20} className="h-9 w-24" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                <Button type="submit" size="sm" disabled={isPending} className="bg-teal-600 hover:bg-teal-700 text-white">
                  {isPending ? "Checking…" : isEdit ? "Save Changes" : "Create Shift"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
