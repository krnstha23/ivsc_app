"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getTeacherAvailabilityForDay } from "@/app/(app)/teachers/actions";
import type { DaySlotWithTeacher } from "@/app/(app)/teachers/actions";

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0"),
);

/** "HH:MM" → minutes from midnight (0–1440). */
function timeToMinutes(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatHour12(hour24: number): string {
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const h = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${h} ${suffix}`;
}

function formatTime12(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  const h24 = Number(hStr ?? 0);
  const m = Number(mStr ?? 0);
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix}`;
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
  const [slots, setSlots] = React.useState<DaySlotWithTeacher[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !date) {
      setSlots([]);
      return;
    }
    setLoading(true);
    getTeacherAvailabilityForDay(date)
      .then(({ slots: s }) => setSlots(s))
      .finally(() => setLoading(false));
  }, [open, date]);

  const title =
    date != null
      ? `Availability - ${formatDateTitle(date)}`
      : "Availability";

  const ROW_PX = 72; // fixed height per hour row
  const TOTAL_PX = ROW_PX * 24;
  const GAP_PX = 6; // visual gap between back-to-back cards

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl overflow-hidden"
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Loading…
            </div>
          ) : slots.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No availability for this day.
            </div>
          ) : (
            <div className="mt-2 max-h-[60vh] overflow-auto rounded-md border bg-card">
              <div className="grid grid-cols-[4.25rem_1fr]">
                {/* Left: hour labels */}
                <div className="border-r bg-muted/20">
                  {HOURS.map((h, idx) => (
                    <div
                      key={h}
                      className={idx === 0 ? "" : "border-t"}
                      style={{ height: ROW_PX }}
                    >
                      <div className="flex h-full items-center justify-center text-xs font-medium tabular-nums text-muted-foreground">
                        {formatHour12(Number(h))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right: fixed-height grid + absolutely positioned cards */}
                <div className="relative" style={{ height: TOTAL_PX }}>
                  {HOURS.map((h, idx) => (
                    <div
                      key={h}
                      className={idx === 0 ? "" : "border-t"}
                      style={{
                        position: "absolute",
                        top: idx * ROW_PX,
                        left: 0,
                        right: 0,
                        height: ROW_PX,
                      }}
                      aria-hidden
                    />
                  ))}

                  {slots.map((slot) => {
                    const startMin = timeToMinutes(slot.startTime);
                    const endMin = timeToMinutes(slot.endTime);
                    const top = (startMin / 60) * ROW_PX;
                    const rawHeight = ((endMin - startMin) / 60) * ROW_PX;
                    const height = Math.max(16, rawHeight - GAP_PX);
                    return (
                      <div
                        key={slot.id}
                        className="absolute left-3 right-3 flex items-center justify-center rounded-md border-2 border-amber-500/80 bg-amber-500/10 px-2 shadow-sm"
                        style={{ top, height }}
                      >
                        <div className="w-full text-center text-xs font-medium tabular-nums leading-none">
                          {formatTime12(slot.startTime)} - {formatTime12(slot.endTime)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
