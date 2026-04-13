"use client";

import * as React from "react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBookingsForDay } from "@/app/(app)/calendar/actions";
import type { DayBookingItem } from "@/app/(app)/calendar/actions";
import {
    cancelBooking,
    findSlotsForReschedule,
    rescheduleToSlot,
} from "@/app/(app)/packages/actions";
import type { RescheduleSlotResult } from "@/app/(app)/packages/actions";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, "0"),
);

function timeToMinutes(s: string): number {
    const [h, m] = s.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
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

function formatDayForInput(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function RescheduleInner({
    booking,
    calendarDate,
    onClose,
    onDone,
}: {
    booking: DayBookingItem;
    calendarDate: Date;
    onClose: () => void;
    onDone: () => void;
}) {
    const [day, setDay] = React.useState(() =>
        formatDayForInput(calendarDate),
    );
    const [slots, setSlots] = React.useState<RescheduleSlotResult["slots"]>(
        [],
    );
    const [loading, setLoading] = React.useState(false);
    const [selectedStartTime, setSelectedStartTime] = React.useState<
        string | null
    >(null);
    const [submitting, setSubmitting] = React.useState(false);

    const loadSlots = React.useCallback(async () => {
        setLoading(true);
        setSelectedStartTime(null);
        try {
            const { slots: list } = await findSlotsForReschedule(
                booking.id,
                day,
            );
            setSlots(list);
        } finally {
            setLoading(false);
        }
    }, [day, booking.id]);

    React.useEffect(() => {
        loadSlots();
    }, [loadSlots]);

    const handleConfirm = async () => {
        if (!selectedStartTime) return;
        setSubmitting(true);
        const result = await rescheduleToSlot({
            bookingId: booking.id,
            date: day,
            startTime: selectedStartTime,
        });
        setSubmitting(false);
        if (result.success) {
            toast.success("Booking rescheduled.");
            onDone();
            onClose();
        } else {
            toast.error(result.error);
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="reschedule-day">New date</Label>
                <Input
                    id="reschedule-day"
                    type="date"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    className="max-w-xs"
                />
            </div>
            {loading ? (
                <p className="text-muted-foreground text-sm">Loading slots…</p>
            ) : slots.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                    No open slots on this day. Try another date.
                </p>
            ) : (
                <div
                    className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-2"
                    role="radiogroup"
                    aria-label="Pick a new time"
                >
                    {slots.map((slot, idx) => {
                        const catClass =
                            slot.category === "STANDARD"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                                : slot.category === "PRIORITY"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200";
                        return (
                            <label
                                key={`${slot.startTime}-${slot.endTime}-${idx}`}
                                className={cn(
                                    "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm",
                                    selectedStartTime === slot.startTime &&
                                        "border-primary bg-primary/10",
                                )}
                            >
                                <input
                                    type="radio"
                                    name="reschedule-slot"
                                    value={slot.startTime}
                                    checked={selectedStartTime === slot.startTime}
                                    onChange={() =>
                                        setSelectedStartTime(slot.startTime)
                                    }
                                    className="sr-only"
                                />
                                <span className="tabular-nums">
                                    {formatTime12(slot.startTime)} –{" "}
                                    {formatTime12(slot.endTime)}
                                </span>
                                <span
                                    className={cn(
                                        "rounded px-2 py-0.5 text-xs font-medium",
                                        catClass,
                                    )}
                                >
                                    {slot.category}
                                </span>
                            </label>
                        );
                    })}
                </div>
            )}
            <div className="flex justify-end gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={submitting}
                >
                    Back
                </Button>
                <Button
                    type="button"
                    onClick={handleConfirm}
                    disabled={submitting || !selectedStartTime}
                >
                    {submitting ? "Saving…" : "Confirm"}
                </Button>
            </div>
        </div>
    );
}

export function DayBookingsDialog({
    open,
    onOpenChange,
    date,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    date: Date | null;
}) {
    const [bookings, setBookings] = React.useState<DayBookingItem[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [rescheduleTarget, setRescheduleTarget] =
        React.useState<DayBookingItem | null>(null);
    const [cancellingId, setCancellingId] = React.useState<string | null>(null);
    const [confirmCancelId, setConfirmCancelId] = React.useState<string | null>(null);

    const loadBookings = React.useCallback(async () => {
        if (!open || !date) {
            setBookings([]);
            return;
        }
        setLoading(true);
        try {
            setBookings(await getBookingsForDay(date));
        } finally {
            setLoading(false);
        }
    }, [open, date]);

    React.useEffect(() => {
        loadBookings();
    }, [loadBookings]);

    const title =
        date != null ? `Bookings - ${formatDateTitle(date)}` : "Bookings";

    const ROW_PX = 72;
    const TOTAL_PX = ROW_PX * 24;
    const GAP_PX = 6;

    const handleCancelBooking = async (bookingId: string) => {
        setCancellingId(bookingId);
        const result = await cancelBooking(bookingId);
        setCancellingId(null);
        setConfirmCancelId(null);
        if (result.success) {
            toast.success("Booking cancelled.");
            await loadBookings();
        } else {
            toast.error(result.error);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl overflow-hidden" showCloseButton>
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                    </DialogHeader>
                    <div className="min-w-0">
                        {loading ? (
                            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                                Loading…
                            </div>
                        ) : bookings.length === 0 ? (
                            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                                No bookings for this day.
                            </div>
                        ) : (
                            <div className="mt-2 max-h-[60vh] overflow-auto rounded-md border bg-card">
                                <div className="grid grid-cols-[4.25rem_1fr]">
                                    <div className="border-r bg-muted/20">
                                        {HOURS.map((h, idx) => (
                                            <div
                                                key={h}
                                                className={idx === 0 ? "" : "border-t"}
                                                style={{ height: ROW_PX }}
                                            >
                                                <div className="flex h-full items-center justify-center text-xs font-medium tabular-nums text-muted-foreground">
                                                    {formatTime12(`${h}:00`)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div
                                        className="relative"
                                        style={{ height: TOTAL_PX }}
                                    >
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

                                        {bookings.map((booking) => {
                                            const startMin = timeToMinutes(
                                                booking.startTime,
                                            );
                                            const endMin = timeToMinutes(
                                                booking.endTime,
                                            );
                                            const top =
                                                (startMin / 60) * ROW_PX;
                                            const rawHeight =
                                                ((endMin - startMin) / 60) *
                                                ROW_PX;
                                            const height = Math.max(
                                                48,
                                                rawHeight - GAP_PX,
                                            );
                                            const showActions =
                                                booking.status !== "CANCELLED";
                                            return (
                                                <div
                                                    key={booking.id}
                                                    className="absolute left-3 right-3 flex flex-col justify-center gap-1 rounded-md border-2 border-primary/80 bg-primary/10 px-2 py-1 shadow-sm"
                                                    style={{ top, height }}
                                                >
                                                    <div className="text-center text-xs font-medium tabular-nums leading-tight">
                                                        {formatTime12(
                                                            booking.startTime,
                                                        )}{" "}
                                                        –{" "}
                                                        {formatTime12(
                                                            booking.endTime,
                                                        )}
                                                    </div>
                                                    <div className="text-center text-[10px] text-muted-foreground">
                                                        {booking.teacherName} ·{" "}
                                                        {booking.studentName}
                                                    </div>
                                                    {showActions ? (
                                                        <div className="mt-1 flex flex-wrap justify-center gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="destructive"
                                                                size="sm"
                                                                className="h-7 text-[10px] px-2"
                                                                disabled={
                                                                    cancellingId ===
                                                                    booking.id
                                                                }
                                                                onClick={() =>
                                                                    setConfirmCancelId(
                                                                        booking.id,
                                                                    )
                                                                }
                                                            >
                                                                Cancel
                                                            </Button>
                                                            {booking.viewerMayReschedule ? (
                                                                <Button
                                                                    type="button"
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    className="h-7 text-[10px] px-2"
                                                                    onClick={() =>
                                                                        setRescheduleTarget(
                                                                            booking,
                                                                        )
                                                                    }
                                                                >
                                                                    Reschedule
                                                                </Button>
                                                            ) : null}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={rescheduleTarget !== null}
                onOpenChange={(o) => {
                    if (!o) setRescheduleTarget(null);
                }}
            >
                <DialogContent className="max-w-md" showCloseButton>
                    <DialogHeader>
                        <DialogTitle>Reschedule session</DialogTitle>
                    </DialogHeader>
                    {rescheduleTarget && date ? (
                        <RescheduleInner
                            booking={rescheduleTarget}
                            calendarDate={date}
                            onClose={() => setRescheduleTarget(null)}
                            onDone={loadBookings}
                        />
                    ) : null}
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={confirmCancelId !== null}
                onOpenChange={(o) => {
                    if (!o) setConfirmCancelId(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel booking</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cancel this booking? The time slot will open again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={cancellingId !== null}>
                            Keep
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={cancellingId !== null}
                            onClick={() => {
                                if (confirmCancelId)
                                    handleCancelBooking(confirmCancelId);
                            }}
                        >
                            {cancellingId ? "Cancelling…" : "Yes, cancel"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
