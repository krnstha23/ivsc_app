"use client";

import {
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
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

/** `YYYY-MM-DD` for `d` in the browser's local timezone — matches `<input type="date">` semantics. */
function localCalendarDateString(d = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

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
    onGetStarted,
}: {
    bundle: BundleCardItem;
    onGetStarted: (bundle: BundleCardItem) => void;
}) {
    return (
        <Card className="flex h-full w-full flex-col gap-3 overflow-hidden transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
                {bundle.isFeatured ? (
                    <span className="mb-2 inline-flex w-fit rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        Featured
                    </span>
                ) : null}
                <CardTitle className="text-lg font-medium">
                    {bundle.name}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pb-2">
                <div className="mt-auto shrink-0 space-y-4">
                    <ul className="space-y-2 text-sm">
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
                            <span className="text-xl font-bold tabular-nums">
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
                        <div className="flex flex-wrap items-baseline gap-1.5">
                            <span className="text-lg font-bold tabular-nums">
                                {formatPrice(bundle.pricePriority)}
                            </span>
                            <span className="text-muted-foreground text-sm">
                                Priority
                            </span>
                        </div>
                        <div className="flex flex-wrap items-baseline gap-1.5">
                            <span className="text-base font-bold tabular-nums">
                                {formatPrice(bundle.priceInstant)}
                            </span>
                            <span className="text-muted-foreground text-sm">
                                Instant
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="mt-auto">
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
    const router = useRouter();
    const { data: session } = useSession();
    const minBookableDate = localCalendarDateString();
    const [date, setDate] = useState("");
    const [preferredTime, setPreferredTime] = useState("10:00");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<FindSlotResult | null>(null);
    const [phoneOpen, setPhoneOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [qrOpen, setQrOpen] = useState(false);
    const [bookingPending, setBookingPending] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<SlotOffer | null>(null);
    const [studentPhone, setStudentPhone] = useState("");
    const [studentEmail, setStudentEmail] = useState(session?.user?.email ?? "");

    const validatePhone = (phone: string) => {
        const phoneRegex = /^\+?[\d\s-]{7,15}$/;
        if (!phone.trim()) return "Mobile number is required.";
        if (!phoneRegex.test(phone.trim())) return "Please enter a valid mobile number.";
        return "";
    };

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) return "Email is required.";
        if (!emailRegex.test(email.trim())) return "Please enter a valid email.";
        return "";
    };

    const handleFindSlot = async () => {
        if (!date || !preferredTime) return;
        if (date < minBookableDate) {
            toast.error("Please choose today or a future date.");
            setDate("");
            setResult(null);
            return;
        }
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
                studentPhone,
                studentEmail,
            });
            if (!res.success) {
                toast.error(res.error ?? "Booking failed. Please try again.");
                setBookingPending(false);
                return;
            }
            toast.success(
                "Please check your email. You will receive the confirmation once the payment is complete.",
            );
            setPhoneOpen(false);
            setConfirmOpen(false);
            setSelectedSlot(null);
            setResult(null);
            setDate("");
            setStudentPhone("");
            setStudentEmail("");
            setBookingPending(false);
                 router.push("/dashboard");
        } catch {
            toast.error("Booking failed. Please try again.");
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
                            const v = e.target.value;
                            if (v && v < minBookableDate) {
                                toast.error(
                                    "You cannot select a past date. Choose today or later.",
                                );
                                setDate("");
                                setResult(null);
                                return;
                            }
                            setDate(v);
                            setResult(null);
                        }}
                        min={minBookableDate}
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
                <>
                    {!result.isExactMatch && (
                        <p className="text-center text-sm text-muted-foreground">
                            The searched time is not available, here is the nearest slot from the searched time and date
                        </p>
                    )}
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
                </>
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
                open={phoneOpen}
                onOpenChange={(open) => {
                    if (!open && !bookingPending) setPhoneOpen(false);
                }}
            >
                <DialogContent
                    showCloseButton
                    className="sm:max-w-md"
                    onPointerDownOutside={(e) =>
                        bookingPending && e.preventDefault()
                    }
                >
                    <DialogHeader className="gap-1">
                        <DialogTitle>Enter your details</DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            Confirm the email to get the booking confirmation and enter the phone number that will be used to make the payment.
                        </p>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="student-phone">Mobile Number</Label>
                            <Input
                                id="student-phone"
                                type="tel"
                                placeholder="e.g. +977 9712052360"
                                value={studentPhone}
                                onChange={(e) => setStudentPhone(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="student-email">Email</Label>
                            <Input
                                id="student-email"
                                type="email"
                                placeholder="e.g. student@example.com"
                                value={studentEmail}
                                onChange={(e) => setStudentEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setPhoneOpen(false);
                                setConfirmOpen(true);
                            }}
                            disabled={bookingPending}
                        >
                            Back
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                const phoneError = validatePhone(studentPhone);
                                if (phoneError) {
                                    toast.error(phoneError);
                                    return;
                                }
                                const emailError = validateEmail(studentEmail);
                                if (emailError) {
                                    toast.error(emailError);
                                    return;
                                }
                                setPhoneOpen(false);
                                setQrOpen(true);
                            }}
                            disabled={bookingPending || !studentPhone || !studentEmail}
                        >
                            Next
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                    <DialogFooter className="gap-2 sm:gap-2">
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
                            onClick={() => {
                                setConfirmOpen(false);
                                setPhoneOpen(true);
                            }}
                            disabled={bookingPending || !selectedSlot}
                        >
                            Next
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={qrOpen}
                onOpenChange={(open) => {
                    if (!open && !bookingPending) setQrOpen(false);
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
                        <DialogTitle>Scan QR Code</DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            Scan the qr below to pay and click Confirm button to book the package.
                        </p>
                    </DialogHeader>
                    <div className="flex justify-center">
                        <Image
                            src="/qr-code.png"
                            alt="QR Code"
                            width={250}
                            height={250}
                            className="object-contain"
                        />
                    </div>
                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setQrOpen(false);
                                setPhoneOpen(true);
                            }}
                            disabled={bookingPending}
                        >
                            Back
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                setQrOpen(false);
                                handleConfirmBooking();
                            }}
                            disabled={bookingPending}
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

const bundleGridClass =
    "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3";

function FeaturedTopRow({
    count,
    children,
}: {
    count: number;
    children: ReactNode;
}) {
    if (count <= 0) return null;
    if (count === 1) {
        return (
            <div className="flex w-full justify-center">
                <div className="w-full max-w-md">{children}</div>
            </div>
        );
    }
    if (count === 2) {
        return (
            <div
                className={cn(
                    "mx-auto grid w-full max-w-5xl grid-cols-1 gap-6",
                    "md:grid-cols-2",
                )}
            >
                {children}
            </div>
        );
    }
    return <div className={cn("mx-auto w-full max-w-6xl", bundleGridClass)}>{children}</div>;
}

export function BundleCards({ bundles }: { bundles: BundleCardItem[] }) {
    const [view, setView] = useState<"cards" | "search">("cards");
    const [selectedBundle, setSelectedBundle] =
        useState<BundleCardItem | null>(null);
    const [showMore, setShowMore] = useState(false);

    const { featured, nonFeatured, featuredTop, featuredRest, restBundles } =
        useMemo(() => {
            const featuredList = bundles.filter((b) => b.isFeatured);
            const nonFeat = bundles.filter((b) => !b.isFeatured);
            const top = featuredList.slice(0, 3);
            const rest = featuredList.slice(3);
            return {
                featured: featuredList,
                nonFeatured: nonFeat,
                featuredTop: top,
                featuredRest: rest,
                restBundles: [...rest, ...nonFeat],
            };
        }, [bundles]);

    const hasMoreBundles =
        featuredRest.length > 0 || nonFeatured.length > 0;

    useEffect(() => {
        function handlePopState() {
            setView("cards");
            setSelectedBundle(null);
        }
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    useEffect(() => {
        setShowMore(false);
    }, [bundles]);

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

    const handleGetStarted = (bundle: BundleCardItem) => {
        setSelectedBundle(bundle);
        setView("search");
        window.history.pushState(
            { view: "search", bundleId: bundle.id },
            "",
            window.location.pathname,
        );
    };

    if (featured.length === 0) {
        return (
            <div className={cn("mx-auto w-full max-w-6xl", bundleGridClass)}>
                {bundles.map((bundle) => (
                    <BundleCard
                        key={bundle.id}
                        bundle={bundle}
                        onGetStarted={handleGetStarted}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
            <FeaturedTopRow count={featuredTop.length}>
                {featuredTop.map((bundle) => (
                    <BundleCard
                        key={bundle.id}
                        bundle={bundle}
                        onGetStarted={handleGetStarted}
                    />
                ))}
            </FeaturedTopRow>

            {hasMoreBundles && !showMore ? (
                <div className="flex justify-center">
                    <Button
                        type="button"
                        variant="outline"
                        aria-expanded={false}
                        onClick={() => setShowMore(true)}
                    >
                        Show more bundles
                    </Button>
                </div>
            ) : null}

            {hasMoreBundles && showMore ? (
                <>
                    <div className={bundleGridClass}>
                        {restBundles.map((bundle) => (
                            <BundleCard
                                key={bundle.id}
                                bundle={bundle}
                                onGetStarted={handleGetStarted}
                            />
                        ))}
                    </div>
                    <div className="flex justify-center">
                        <Button
                            type="button"
                            variant="outline"
                            aria-expanded={true}
                            onClick={() => setShowMore(false)}
                        >
                            Show less
                        </Button>
                    </div>
                </>
            ) : null}
        </div>
    );
}
