"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    findSlotForPreference,
    createBookingForSlot,
    type FindSlotResult,
    type SlotOffer,
} from "@/app/(app)/packages/actions";
import { formatRs } from "@/lib/format-rs";

function formatPrice(value: number) {
    return formatRs(value);
}

function formatTime(timeStr: string) {
    const [h, m] = timeStr.split(":").map(Number);
    const hour = h ?? 0;
    const minute = m ?? 0;
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

function categoryBadgeClass(category: string) {
    return cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        category === "STANDARD" &&
            "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200",
        category === "PRIORITY" &&
            "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
        category === "INSTANT" &&
            "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
    );
}

export function PackageBookingSection({
    packageId,
    packageName,
    bundles,
    classesRemaining,
}: {
    packageId: string;
    packageName: string;
    bundles: { id: string; name: string; duration: number }[];
    classesRemaining: number;
}) {
    const router = useRouter();
    const [selectedBundleId, setSelectedBundleId] = React.useState(
        () => bundles[0]?.id ?? "",
    );
    const [date, setDate] = React.useState("");
    const [preferredTime, setPreferredTime] = React.useState("10:00");
    const [loading, setLoading] = React.useState(false);
    const [result, setResult] = React.useState<FindSlotResult | null>(null);
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [bookingPending, setBookingPending] = React.useState(false);
    const [selectedSlot, setSelectedSlot] = React.useState<SlotOffer | null>(
        null,
    );

    React.useEffect(() => {
        if (bundles.length === 1 && bundles[0]) {
            setSelectedBundleId(bundles[0].id);
        }
    }, [bundles]);

    const resetSearch = React.useCallback(() => {
        setResult(null);
        setSelectedSlot(null);
    }, []);

    const handleBundleChange = (id: string) => {
        setSelectedBundleId(id);
        resetSearch();
    };

    const handleFindSlot = async () => {
        if (!selectedBundleId || !date || !preferredTime) return;
        setLoading(true);
        resetSearch();
        try {
            const res = await findSlotForPreference(
                selectedBundleId,
                date,
                preferredTime,
            );
            setResult(res);
            if (res.found) setSelectedSlot(res.slot);
        } catch {
            toast.error("Failed to find available slots.");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAlternative = (alt: SlotOffer) => {
        setDate(alt.date);
        setSelectedSlot(alt);
        setResult({ found: true, slot: alt });
    };

    const handleConfirmBooking = async () => {
        if (!selectedSlot || !selectedBundleId) return;
        setBookingPending(true);
        try {
            const res = await createBookingForSlot({
                bundleId: selectedBundleId,
                date: selectedSlot.date,
                startTime: selectedSlot.startTime,
                packageId,
            });
            if (res.success) {
                toast.success(
                    `${packageName}: session booked. A teacher will be assigned.`,
                );
                setConfirmOpen(false);
                setSelectedSlot(null);
                setResult(null);
                setDate("");
                router.refresh();
            } else {
                toast.error(res.error);
            }
        } catch {
            toast.error("Booking failed. Please try again.");
        } finally {
            setBookingPending(false);
        }
    };

    if (bundles.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Book a session</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        No active bundles include this package yet. Check back
                        later or contact support.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-base font-semibold">Book a session</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {classesRemaining} class
                    {classesRemaining !== 1 ? "es" : ""} remaining on{" "}
                    {packageName}. Pick a date and preferred time; we offer one
                    slot that matches (no teacher is shown until after booking).
                </p>
            </div>

            {bundles.length > 1 && (
                <div className="space-y-1.5">
                    <Label htmlFor="booking-bundle">Bundle</Label>
                    <Select
                        value={selectedBundleId}
                        onValueChange={handleBundleChange}
                    >
                        <SelectTrigger
                            id="booking-bundle"
                            className="w-full max-w-md"
                        >
                            <SelectValue placeholder="Select a bundle" />
                        </SelectTrigger>
                        <SelectContent>
                            {bundles.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                    {b.name}
                                    {b.duration > 0
                                        ? ` · ${b.duration} min`
                                        : ""}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                    <Label htmlFor="pkg-slot-date">Date</Label>
                    <Input
                        id="pkg-slot-date"
                        type="date"
                        value={date}
                        onChange={(e) => {
                            setDate(e.target.value);
                            resetSearch();
                        }}
                        min={new Date().toISOString().slice(0, 10)}
                    />
                </div>
                <div className="flex-1 space-y-1.5">
                    <Label htmlFor="pkg-slot-time">Preferred time</Label>
                    <Input
                        id="pkg-slot-time"
                        type="time"
                        value={preferredTime}
                        onChange={(e) => {
                            setPreferredTime(e.target.value);
                            resetSearch();
                        }}
                    />
                </div>
                <Button
                    type="button"
                    onClick={handleFindSlot}
                    disabled={
                        !selectedBundleId || !date || !preferredTime || loading
                    }
                    className="shrink-0"
                >
                    {loading ? "Searching…" : "Find slot"}
                </Button>
            </div>

            {loading && (
                <p className="text-center text-sm text-muted-foreground">
                    Finding the best available slot…
                </p>
            )}

            {result?.found && result.slot && (
                <Card className="max-w-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                            Your offered slot
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-baseline justify-between gap-2">
                            <p className="text-lg font-semibold">
                                {formatTime(result.slot.startTime)} –{" "}
                                {formatTime(result.slot.endTime)}
                            </p>
                            <span className="shrink-0 text-sm text-muted-foreground">
                                {result.slot.duration} min
                            </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                            <span
                                className={categoryBadgeClass(
                                    result.slot.category,
                                )}
                            >
                                {result.slot.category}
                            </span>
                            <span className="text-2xl font-bold tabular-nums">
                                {formatPrice(result.slot.price)}
                            </span>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            type="button"
                            className="w-full"
                            onClick={() => {
                                setSelectedSlot(result.slot);
                                setConfirmOpen(true);
                            }}
                        >
                            Confirm & book
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {result && !result.found && (
                <div className="space-y-4">
                    <p className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                        {result.message}
                    </p>
                    {result.alternatives.length > 0 && (
                        <>
                            <h3 className="text-sm font-medium">
                                Nearest alternatives
                            </h3>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {result.alternatives.map((alt, i) => (
                                    <Card
                                        key={i}
                                        className="cursor-pointer transition-shadow hover:shadow-md"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() =>
                                            handleSelectAlternative(alt)
                                        }
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === "Enter" ||
                                                e.key === " "
                                            ) {
                                                e.preventDefault();
                                                handleSelectAlternative(alt);
                                            }
                                        }}
                                    >
                                        <CardContent className="space-y-2 p-4">
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(
                                                    alt.date + "T12:00:00",
                                                ).toLocaleDateString(undefined, {
                                                    weekday: "short",
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </p>
                                            <p className="font-medium">
                                                {formatTime(alt.startTime)} –{" "}
                                                {formatTime(alt.endTime)}
                                            </p>
                                            <div className="flex items-baseline justify-between">
                                                <span
                                                    className={categoryBadgeClass(
                                                        alt.category,
                                                    )}
                                                >
                                                    {alt.category}
                                                </span>
                                                <span className="font-semibold tabular-nums">
                                                    {formatPrice(alt.price)}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            <Dialog
                open={confirmOpen}
                onOpenChange={(open) => {
                    if (!open && !bookingPending) setConfirmOpen(false);
                }}
            >
                <DialogContent
                    showCloseButton
                    className="sm:max-w-md"
                    onPointerDownOutside={(e) =>
                        bookingPending && e.preventDefault()
                    }
                >
                    <DialogHeader>
                        <DialogTitle>Confirm your booking</DialogTitle>
                    </DialogHeader>
                    {selectedSlot && (
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">
                                    Session ({packageName})
                                </p>
                                <p className="font-medium">
                                    {formatTime(selectedSlot.startTime)} –{" "}
                                    {formatTime(selectedSlot.endTime)} (
                                    {selectedSlot.duration} min)
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {new Date(
                                        selectedSlot.date + "T12:00:00",
                                    ).toLocaleDateString(undefined, {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </p>
                            </div>
                            <div className="flex items-baseline justify-between border-t pt-3">
                                <span
                                    className={categoryBadgeClass(
                                        selectedSlot.category,
                                    )}
                                >
                                    {selectedSlot.category}
                                </span>
                                <span className="text-xl font-bold tabular-nums">
                                    {formatPrice(selectedSlot.price)}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                One class will be deducted from your enrollment.
                                A teacher will be assigned automatically.
                            </p>
                        </div>
                    )}
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                !bookingPending && setConfirmOpen(false)
                            }
                            disabled={bookingPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmBooking}
                            disabled={bookingPending || !selectedSlot}
                        >
                            {bookingPending ? "Booking…" : "Confirm & book"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
