"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    CalendarMark,
    ClockCircle,
    BookMinimalistic,
    UserRounded,
} from "@solar-icons/react";

export type BookingItem = {
    id: string;
    scheduledAt: string;
    duration: number;
    status: string;
    notes: string | null;
    meetLink: string | null;
    packageName: string | null;
    teacherName: string;
};

interface BookingsTabsProps {
    upcoming: BookingItem[];
    past: BookingItem[];
    cancelled: BookingItem[];
    activeTab: string;
}

const STATUS_CONFIG: Record<
    string,
    { label: string; className: string }
> = {
    PENDING: {
        label: "Pending",
        className:
            "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    },
    CONFIRMED: {
        label: "Confirmed",
        className:
            "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    CANCELLED: {
        label: "Cancelled",
        className:
            "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    },
    COMPLETED: {
        label: "Completed",
        className:
            "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    },
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
});

function StatusBadge({ status }: { status: string }) {
    const config = STATUS_CONFIG[status] ?? {
        label: status,
        className: "",
    };
    return (
        <Badge variant="outline" className={config.className}>
            {config.label}
        </Badge>
    );
}

function BookingCard({ booking }: { booking: BookingItem }) {
    const date = new Date(booking.scheduledAt);

    return (
        <div className="flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                        <CalendarMark className="size-4 text-muted-foreground" />
                        {dateFormat.format(date)}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <ClockCircle className="size-4" />
                        {timeFormat.format(date)} &middot; {booking.duration}{" "}
                        min
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <UserRounded className="size-4" />
                        {booking.teacherName}
                    </span>
                    {booking.packageName && (
                        <span className="flex items-center gap-1.5">
                            <BookMinimalistic className="size-4" />
                            {booking.packageName}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <StatusBadge status={booking.status} />
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/sessions/${booking.id}/room`}>
                        Enter Room
                    </Link>
                </Button>
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
            <CalendarMark className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{message}</p>
        </div>
    );
}

export function BookingsTabs({
    upcoming,
    past,
    cancelled,
    activeTab,
}: BookingsTabsProps) {
    const [tab, setTab] = useState(activeTab);

    function onTabChange(value: string) {
        setTab(value);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", value);
        window.history.replaceState({}, "", url.toString());
    }

    return (
        <Tabs value={tab} onValueChange={onTabChange}>
            <TabsList>
                <TabsTrigger value="upcoming">
                    Upcoming ({upcoming.length})
                </TabsTrigger>
                <TabsTrigger value="past">
                    Past ({past.length})
                </TabsTrigger>
                <TabsTrigger value="cancelled">
                    Cancelled ({cancelled.length})
                </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-4">
                {upcoming.length === 0 ? (
                    <EmptyState message="No upcoming sessions. Browse available teachers to book your first session!" />
                ) : (
                    <div className="flex flex-col gap-3">
                        {upcoming.map((b) => (
                            <BookingCard key={b.id} booking={b} />
                        ))}
                    </div>
                )}
            </TabsContent>

            <TabsContent value="past" className="mt-4">
                {past.length === 0 ? (
                    <EmptyState message="No past sessions yet. Your completed sessions will appear here." />
                ) : (
                    <div className="flex flex-col gap-3">
                        {past.map((b) => (
                            <BookingCard key={b.id} booking={b} />
                        ))}
                    </div>
                )}
            </TabsContent>

            <TabsContent value="cancelled" className="mt-4">
                {cancelled.length === 0 ? (
                    <EmptyState message="No cancelled sessions." />
                ) : (
                    <div className="flex flex-col gap-3">
                        {cancelled.map((b) => (
                            <BookingCard key={b.id} booking={b} />
                        ))}
                    </div>
                )}
            </TabsContent>
        </Tabs>
    );
}
