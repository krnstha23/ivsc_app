"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
    getAvailableSlotsForPackage,
    createBooking,
    type AvailableSlot,
} from "@/app/(app)/packages/actions";

export function PackageBookingSection({
    packageId,
    packageName,
    initialSlots,
    classesRemaining,
}: {
    packageId: string;
    packageName: string;
    initialSlots: AvailableSlot[];
    classesRemaining: number;
}) {
    const [slots, setSlots] = React.useState<AvailableSlot[]>(initialSlots);
    const [loading, setLoading] = React.useState(false);
    const [confirmSlot, setConfirmSlot] = React.useState<AvailableSlot | null>(
        null
    );
    const [bookingPending, setBookingPending] = React.useState(false);
    const [message, setMessage] = React.useState<
        { type: "success"; text: string } | { type: "error"; text: string } | null
    >(null);

    const startDate = React.useMemo(() => new Date(), []);
    const endDate = React.useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d;
    }, []);

    const fetchSlots = React.useCallback(async () => {
        setLoading(true);
        try {
            const next = await getAvailableSlotsForPackage(
                packageId,
                startDate,
                endDate
            );
            setSlots(next);
        } finally {
            setLoading(false);
        }
    }, [packageId, startDate, endDate]);

    const handleBook = React.useCallback(async () => {
        if (!confirmSlot) return;
        setBookingPending(true);
        try {
            const result = await createBooking({
                availabilityId: confirmSlot.id,
                packageId,
            });
            if (result.success) {
                setMessage({
                    type: "success",
                    text: `Booked ${packageName} with ${confirmSlot.teacherName} on ${formatDate(confirmSlot.date)} at ${confirmSlot.startTime}.`,
                });
                setConfirmSlot(null);
                await fetchSlots();
            } else {
                setMessage({ type: "error", text: result.error });
            }
        } finally {
            setBookingPending(false);
        }
    }, [confirmSlot, packageId, packageName, fetchSlots]);

    return (
        <div className="flex flex-col gap-4">
            {message && (
                <div
                    className={
                        message.type === "success"
                            ? "rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200"
                            : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    }
                >
                    {message.text}
                </div>
            )}
            <h2 className="flex items-center gap-2 text-base font-semibold">
                <span aria-hidden>📅</span>
                Book a session
            </h2>
            <p className="text-sm text-muted-foreground">
                {classesRemaining} class{classesRemaining !== 1 ? "es" : ""}{" "}
                remaining. Select an available slot below.
            </p>
            <Button
                variant="outline"
                size="sm"
                onClick={fetchSlots}
                disabled={loading}
            >
                {loading ? "Loading…" : "Refresh available slots"}
            </Button>
            {slots.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground">
                    No available slots in the next 14 days. Try refreshing later
                    or ask teachers to add availability.
                </p>
            )}
            {slots.length > 0 && (
                <ul className="flex flex-col gap-2 rounded-md border divide-y">
                    {slots.map((slot) => (
                        <li
                            key={slot.id}
                            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 first:pt-3 last:pb-3"
                        >
                            <div className="text-sm">
                                <span className="font-medium">
                                    {formatDate(slot.date)}
                                </span>
                                <span className="text-muted-foreground">
                                    {" "}
                                    {slot.startTime}–{slot.endTime}
                                </span>
                                <span className="text-muted-foreground">
                                    {" "}
                                    · {slot.teacherName}
                                </span>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => setConfirmSlot(slot)}
                            >
                                Book
                            </Button>
                        </li>
                    ))}
                </ul>
            )}

            {confirmSlot && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="confirm-booking-title"
                >
                    <div className="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg">
                        <h2
                            id="confirm-booking-title"
                            className="text-lg font-semibold"
                        >
                            Confirm booking
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Book <strong>{packageName}</strong> with{" "}
                            <strong>{confirmSlot.teacherName}</strong> on{" "}
                            {formatDate(confirmSlot.date)} at{" "}
                            {confirmSlot.startTime}–{confirmSlot.endTime} (
                            {confirmSlot.durationMinutes} min)? One class will be
                            deducted from your enrollment.
                        </p>
                        <div className="mt-4 flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setConfirmSlot(null)}
                                disabled={bookingPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => handleBook()}
                                disabled={bookingPending}
                            >
                                {bookingPending ? "Booking…" : "Confirm"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatDate(isoDate: string): string {
    const d = new Date(isoDate + "T12:00:00");
    return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}
