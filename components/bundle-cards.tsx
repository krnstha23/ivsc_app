"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle } from "@solar-icons/react";
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
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    findSlotForPreference,
    createBookingForSlot,
    type SlotOffer,
    type FindSlotResult,
} from "@/app/(app)/packages/actions";
import { formatRs } from "@/lib/format-rs";

export type BundleCardItem = {
    id: string;
    name: string;
    description: string | null;
    priceStandard: number;
    pricePriority: number;
    priceInstant: number;
    duration: number;
    hasEvaluation: boolean;
    discountPercent: number | null;
    isActive: boolean;
    isFeatured: boolean;
    packageIds: string[];
};

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

function BundleCard({
    bundle,
    isCenter,
    onGetStarted,
}: {
    bundle: BundleCardItem;
    isCenter: boolean;
    onGetStarted: (bundle: BundleCardItem) => void;
}) {
    return (
        <Card
            className={cn(
                "flex w-full flex-col overflow-hidden transition-shadow hover:shadow-md",
                isCenter
                    ? "sm:min-h-[420px] sm:scale-105"
                    : "sm:min-h-[162px]",
            )}
        >
            <CardHeader className={cn("pb-2", isCenter && "pb-3")}>
                <CardTitle
                    className={cn(
                        "font-medium",
                        isCenter ? "text-lg" : "text-base",
                    )}
                >
                    {bundle.name}
                </CardTitle>
            </CardHeader>
            <CardContent
                className={cn(
                    "flex min-h-0 flex-1 flex-col gap-4 pb-4",
                    isCenter && "gap-5 py-6",
                )}
            >
                <div className="mt-auto shrink-0 space-y-4">
                    <ul
                        className={cn(
                            "space-y-2",
                            isCenter ? "text-base" : "text-sm",
                        )}
                    >
                        <li className="flex items-center gap-2">
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <CheckCircle
                                    size={12}
                                    className="size-3"
                                    weight="Bold"
                                />
                            </span>
                            <span className="text-muted-foreground">
                                {bundle.packageIds.length} package
                                {bundle.packageIds.length !== 1 ? "s" : ""}{" "}
                                included
                            </span>
                        </li>
                        {bundle.description && (
                            <li className="flex items-start gap-2">
                                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <CheckCircle
                                        size={12}
                                        className="size-3"
                                        weight="Bold"
                                    />
                                </span>
                                <span className="text-muted-foreground line-clamp-2">
                                    {bundle.description}
                                </span>
                            </li>
                        )}
                    </ul>
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-baseline gap-1.5">
                            <span
                                className={cn(
                                    "font-bold tabular-nums",
                                    isCenter ? "text-4xl" : "text-3xl",
                                )}
                            >
                                {formatPrice(bundle.priceStandard)}
                            </span>
                            <span className="text-muted-foreground text-sm">
                                Standard
                                {bundle.discountPercent != null &&
                                bundle.discountPercent > 0
                                    ? ` · ${bundle.discountPercent}% off`
                                    : ""}
                            </span>
                        </div>
                        <p className="text-muted-foreground text-xs tabular-nums sm:text-sm">
                            Priority {formatPrice(bundle.pricePriority)} ·
                            Instant {formatPrice(bundle.priceInstant)}
                        </p>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button
                    type="button"
                    className="w-full"
                    size="default"
                    onClick={() => onGetStarted(bundle)}
                >
                    Get started
                </Button>
            </CardFooter>
        </Card>
    );
}

// ---------------------------------------------------------------------------
// BundleDateSearch — preferred time + single offered slot UX
// ---------------------------------------------------------------------------

function BundleDateSearch({ bundle }: { bundle: BundleCardItem }) {
    const [date, setDate] = useState("");
    const [preferredTime, setPreferredTime] = useState("10:00");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<FindSlotResult | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [bookingPending, setBookingPending] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<SlotOffer | null>(null);

    const handleFindSlot = async () => {
        if (!date || !preferredTime) return;
        setLoading(true);
        setResult(null);
        setSelectedSlot(null);
        try {
            const res = await findSlotForPreference(
                bundle.id,
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
        if (!selectedSlot) return;
        setBookingPending(true);
        try {
            const res = await createBookingForSlot({
                bundleId: bundle.id,
                date: selectedSlot.date,
                startTime: selectedSlot.startTime,
            });
            if (res.success) {
                toast.success(
                    "Session booked successfully! A teacher has been assigned.",
                );
                setConfirmOpen(false);
                setSelectedSlot(null);
                setResult(null);
                setDate("");
            } else {
                toast.error(res.error);
            }
        } catch {
            toast.error("Booking failed. Please try again.");
        } finally {
            setBookingPending(false);
        }
    };

    return (
        <div className="w-full space-y-6">
            <div className="text-center">
                <h2 className="text-lg font-semibold text-foreground">
                    {bundle.name}
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                    Select your preferred date and time to find the best
                    available slot
                </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                    <Label htmlFor="slot-date">Date</Label>
                    <Input
                        id="slot-date"
                        type="date"
                        value={date}
                        onChange={(e) => {
                            setDate(e.target.value);
                            setResult(null);
                        }}
                        min={new Date().toISOString().slice(0, 10)}
                    />
                </div>
                <div className="flex-1 space-y-1.5">
                    <Label htmlFor="slot-time">Preferred time</Label>
                    <Input
                        id="slot-time"
                        type="time"
                        value={preferredTime}
                        onChange={(e) => {
                            setPreferredTime(e.target.value);
                            setResult(null);
                        }}
                    />
                </div>
                <Button
                    onClick={handleFindSlot}
                    disabled={!date || !preferredTime || loading}
                    className="shrink-0"
                >
                    {loading ? "Searching…" : "Find slot"}
                </Button>
            </div>

            {loading && (
                <p className="text-muted-foreground text-center text-sm">
                    Finding the best available slot…
                </p>
            )}

            {result?.found && result.slot && (
                <Card className="mx-auto max-w-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                            Your offered slot
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-baseline justify-between">
                            <p className="text-lg font-semibold">
                                {formatTime(result.slot.startTime)} –{" "}
                                {formatTime(result.slot.endTime)}
                            </p>
                            <span className="text-muted-foreground text-sm">
                                {result.slot.duration} min
                            </span>
                        </div>
                        <div className="flex items-baseline justify-between">
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
                    <p className="text-muted-foreground rounded-lg border border-border bg-muted/30 px-4 py-6 text-center text-sm">
                        {result.message}
                    </p>
                    {result.alternatives.length > 0 && (
                        <>
                            <h3 className="text-sm font-medium text-foreground">
                                Nearest alternatives
                            </h3>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {result.alternatives.map((alt, i) => (
                                    <Card
                                        key={i}
                                        className="cursor-pointer transition-shadow hover:shadow-md"
                                        onClick={() =>
                                            handleSelectAlternative(alt)
                                        }
                                    >
                                        <CardContent className="space-y-2 p-4">
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(
                                                    alt.date + "T12:00:00",
                                                ).toLocaleDateString(
                                                    undefined,
                                                    {
                                                        weekday: "short",
                                                        month: "short",
                                                        day: "numeric",
                                                    },
                                                )}
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
                                    Session
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
                                A teacher will be automatically assigned to your
                                session.
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

// ---------------------------------------------------------------------------
// BundleCards — main export
// ---------------------------------------------------------------------------

export function BundleCards({ bundles }: { bundles: BundleCardItem[] }) {
    const [view, setView] = useState<"cards" | "search">("cards");
    const [selectedBundle, setSelectedBundle] =
        useState<BundleCardItem | null>(null);

    useEffect(() => {
        function handlePopState() {
            setView("cards");
            setSelectedBundle(null);
        }
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    if (bundles.length === 0) {
        return (
            <p className="text-muted-foreground px-4 py-8 text-center text-sm lg:px-6">
                No bundles yet.
            </p>
        );
    }

    if (view === "search" && selectedBundle) {
        return <BundleDateSearch bundle={selectedBundle} />;
    }

    const centerCard = bundles[0];
    const leftCard = bundles[1] ?? null;
    const rightCard = bundles[2] ?? null;

    const handleGetStarted = (bundle: BundleCardItem) => {
        setSelectedBundle(bundle);
        setView("search");
        window.history.pushState(
            { view: "search", bundleId: bundle.id },
            "",
            window.location.pathname,
        );
    };

    return (
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="order-2 min-w-0 sm:order-1 sm:flex sm:justify-end">
                {leftCard ? (
                    <BundleCard
                        bundle={leftCard}
                        isCenter={false}
                        onGetStarted={handleGetStarted}
                    />
                ) : (
                    <div className="hidden sm:block sm:min-w-0 sm:flex-1" />
                )}
            </div>
            <div className="order-1 flex min-w-0 justify-center sm:order-2">
                <BundleCard
                    bundle={centerCard}
                    isCenter
                    onGetStarted={handleGetStarted}
                />
            </div>
            <div className="order-3 min-w-0 sm:flex sm:justify-start">
                {rightCard ? (
                    <BundleCard
                        bundle={rightCard}
                        isCenter={false}
                        onGetStarted={handleGetStarted}
                    />
                ) : (
                    <div className="hidden sm:block sm:min-w-0 sm:flex-1" />
                )}
            </div>
        </div>
    );
}
