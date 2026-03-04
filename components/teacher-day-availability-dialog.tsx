"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getTeacherAvailabilityForDay } from "@/app/(app)/teachers/actions";
import type { DaySlot } from "@/app/(app)/teachers/actions";

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0"),
);

/** "HH:MM" → minutes from midnight (0–1440). */
function timeToMinutes(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function slotToPosition(slot: DaySlot): { leftPct: number; widthPct: number } {
  const start = timeToMinutes(slot.startTime);
  const end = timeToMinutes(slot.endTime);
  const leftPct = (start / (24 * 60)) * 100;
  const widthPct = ((end - start) / (24 * 60)) * 100;
  return { leftPct, widthPct };
}

function formatDateTitle(date: Date): string {
  return date.toLocaleDateString("default", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function TeacherDayAvailabilityDialog({
  open,
  onOpenChange,
  date,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
}) {
  const [teacherName, setTeacherName] = React.useState("");
  const [slots, setSlots] = React.useState<DaySlot[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !date) {
      setSlots([]);
      setTeacherName("");
      return;
    }
    setLoading(true);
    getTeacherAvailabilityForDay(date)
      .then(({ teacherName: name, slots: s }) => {
        setTeacherName(name);
        setSlots(s);
      })
      .finally(() => setLoading(false));
  }, [open, date]);

  const title =
    date != null
      ? `${teacherName || "Teacher"} - ${formatDateTitle(date)}`
      : "Availability";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl overflow-hidden"
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="min-w-0">
          {/* 24hr timeline labels - horizontal */}
          <div
            className="grid gap-0 border-b bg-muted/30 py-1 text-center text-xs text-muted-foreground"
            style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
          >
            {HOURS.map((hour) => (
              <div key={hour} className="min-w-0">
                {hour}
              </div>
            ))}
          </div>
          {/* Slots track */}
          <div className="relative mt-2 min-h-[72px] w-full">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                Loading…
              </div>
            ) : slots.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                No availability for this day.
              </div>
            ) : (
              <div className="relative h-14 w-full">
                {slots.map((slot) => {
                  const { leftPct, widthPct } = slotToPosition(slot);
                  return (
                    <div
                      key={slot.id}
                      className="absolute top-0 rounded border-2 border-amber-500/80 bg-amber-500/10 px-2 py-1 text-xs shadow-sm"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        minWidth: "min-content",
                      }}
                    >
                      <div className="font-medium tabular-nums">
                        {slot.startTime} - {slot.endTime}
                      </div>
                      <div className="truncate text-muted-foreground">
                        {teacherName || "You"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
