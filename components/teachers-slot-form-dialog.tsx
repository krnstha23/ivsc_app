"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const DURATIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
] as const;

function formatDateForInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function TeachersSlotFormDialog({
  open,
  onOpenChange,
  selectedDate,
  onCreate,
  pending = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  onCreate?: (payload: { date: Date; durationMinutes: number; time: string }) => void;
  pending?: boolean;
}) {
  const [duration, setDuration] = React.useState<15 | 30 | 45>(30);
  const [time, setTime] = React.useState("09:00");

  const dateStr = selectedDate ? formatDateForInput(selectedDate) : "";

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
    onCreate?.({
      date: selectedDate,
      durationMinutes: duration,
      time,
    });
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add availability</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="slot-date">Date</FieldLabel>
              <Input
                id="slot-date"
                type="date"
                value={dateStr}
                disabled
                className="bg-muted"
              />
            </Field>

            <FieldSet>
              <FieldLegend>Duration</FieldLegend>
              <div
                className="flex w-full flex-col gap-2 sm:flex-row sm:gap-2"
                role="radiogroup"
                aria-label="Duration"
              >
                {DURATIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      "relative flex flex-1 cursor-pointer select-none items-center justify-center rounded-md border px-4 py-3 text-sm font-medium transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2",
                      duration === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input bg-background",
                      pending && "pointer-events-none opacity-50"
                    )}
                  >
                    <input
                      type="radio"
                      name="duration"
                      value={opt.value}
                      checked={duration === opt.value}
                      onChange={() => setDuration(opt.value)}
                      className="sr-only"
                      aria-hidden
                      disabled={pending}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </FieldSet>

            <Field>
              <FieldLabel htmlFor="slot-time">Time</FieldLabel>
              <Input
                id="slot-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                disabled={pending}
              />
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
