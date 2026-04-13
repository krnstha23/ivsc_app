"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, useCallback } from "react";
import { AltArrowLeft, AltArrowRight } from "@solar-icons/react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type BookingItem = {
    id: string;
    scheduledAt: string;
    duration: number;
    status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
    meetLink: string | null;
    studentName: string;
    teacherName: string;
    teacherId: string;
};

type Props = {
    bookings: BookingItem[];
    teachers: { id: string; name: string }[];
    students: { id: string; name: string }[];
    weekStart: string;
    filters: {
        teacher: string;
        student: string;
        status: string;
    };
};

const STATUS_COLORS: Record<BookingItem["status"], string> = {
    CONFIRMED:
        "bg-green-100 border-green-300 text-green-800 dark:bg-green-950/40 dark:border-green-800 dark:text-green-300",
    PENDING:
        "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300",
    COMPLETED:
        "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300",
    CANCELLED:
        "bg-red-100 border-red-300 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300",
};

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function TimetableView({
    bookings,
    teachers,
    students,
    weekStart,
    filters,
}: Props) {
    const router = useRouter();
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
        null
    );

    const weekStartDate = useMemo(() => new Date(weekStart), [weekStart]);

    const weekDates = useMemo(
        () =>
            DAYS.map((_, i) => {
                const d = new Date(weekStartDate);
                d.setDate(d.getDate() + i);
                return d;
            }),
        [weekStartDate]
    );

    const weekLabel = useMemo(() => {
        const fmt = new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
        });
        return `${fmt.format(weekDates[0])} – ${fmt.format(weekDates[6])}, ${weekDates[6].getFullYear()}`;
    }, [weekDates]);

    const buildUrl = useCallback(
        (overrides: Record<string, string>) => {
            const merged = { ...filters, weekStart, ...overrides };
            const params = new URLSearchParams();
            if (merged.teacher) params.set("teacher", merged.teacher);
            if (merged.student) params.set("student", merged.student);
            if (merged.status) params.set("status", merged.status);
            if (merged.weekStart) params.set("weekStart", merged.weekStart);
            return `/timetable?${params.toString()}`;
        },
        [filters, weekStart]
    );

    const updateFilter = useCallback(
        (key: string, value: string) => router.push(buildUrl({ [key]: value })),
        [router, buildUrl]
    );

    const navigateWeek = useCallback(
        (direction: -1 | 1) => {
            const d = new Date(weekStartDate);
            d.setDate(d.getDate() + direction * 7);
            updateFilter("weekStart", d.toISOString());
        },
        [weekStartDate, updateFilter]
    );

    const goToCurrentWeek = useCallback(() => {
        const now = new Date();
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        now.setDate(now.getDate() + diff);
        now.setHours(0, 0, 0, 0);
        updateFilter("weekStart", now.toISOString());
    }, [updateFilter]);

    const bookingsBySlot = useMemo(() => {
        const map = new Map<string, BookingItem[]>();
        for (const b of bookings) {
            const dt = new Date(b.scheduledAt);
            const dayIndex = (dt.getDay() + 6) % 7;
            const hour = dt.getHours();
            const key = `${dayIndex}-${hour}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(b);
        }
        return map;
    }, [bookings]);

    const selected = selectedBookingId
        ? bookings.find((b) => b.id === selectedBookingId)
        : null;

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <Select
                    value={filters.teacher || "_all"}
                    onValueChange={(v) =>
                        updateFilter("teacher", v === "_all" ? "" : v)
                    }
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All teachers" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all">All teachers</SelectItem>
                        {teachers.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                                {t.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={filters.student || "_all"}
                    onValueChange={(v) =>
                        updateFilter("student", v === "_all" ? "" : v)
                    }
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All students" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all">All students</SelectItem>
                        {students.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                                {s.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={filters.status || "_all"}
                    onValueChange={(v) =>
                        updateFilter("status", v === "_all" ? "" : v)
                    }
                >
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all">All statuses</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                </Select>

                <div className="ml-auto flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigateWeek(-1)}
                    >
                        <AltArrowLeft size={16} />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={goToCurrentWeek}
                    >
                        Today
                    </Button>
                    <span className="min-w-[170px] text-center text-sm font-medium">
                        {weekLabel}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigateWeek(1)}
                    >
                        <AltArrowRight size={16} />
                    </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto rounded-lg border">
                <div className="min-w-[900px]">
                    {/* Header */}
                    <div className="grid grid-cols-[72px_repeat(7,1fr)] border-b bg-muted/50">
                        <div className="p-2 text-center text-xs font-medium text-muted-foreground">
                            Time
                        </div>
                        {weekDates.map((d, i) => {
                            const isToday =
                                d.toDateString() === new Date().toDateString();
                            return (
                                <div
                                    key={i}
                                    className={`border-l p-2 text-center text-xs font-medium ${
                                        isToday
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground"
                                    }`}
                                >
                                    <div>{DAYS[i]}</div>
                                    <div className="text-lg font-semibold">
                                        {d.getDate()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Time rows */}
                    {HOURS.map((hour) => (
                        <div
                            key={hour}
                            className="grid grid-cols-[72px_repeat(7,1fr)] border-b last:border-b-0"
                        >
                            <div className="flex items-start justify-center border-r p-1 pt-2 text-xs text-muted-foreground">
                                {hour.toString().padStart(2, "0")}:00
                            </div>
                            {DAYS.map((_, dayIndex) => {
                                const slotBookings =
                                    bookingsBySlot.get(
                                        `${dayIndex}-${hour}`
                                    ) ?? [];
                                return (
                                    <div
                                        key={dayIndex}
                                        className="relative min-h-[52px] border-l p-0.5"
                                    >
                                        {slotBookings.map((b) => (
                                            <button
                                                key={b.id}
                                                onClick={() =>
                                                    setSelectedBookingId(
                                                        selectedBookingId ===
                                                            b.id
                                                            ? null
                                                            : b.id
                                                    )
                                                }
                                                className={`mb-0.5 w-full cursor-pointer rounded border px-1.5 py-0.5 text-left text-[11px] leading-tight transition-opacity hover:opacity-80 ${STATUS_COLORS[b.status]} ${selectedBookingId === b.id ? "ring-2 ring-primary" : ""}`}
                                            >
                                                <div className="truncate font-medium">
                                                    {b.studentName}
                                                </div>
                                                <div className="truncate opacity-75">
                                                    {b.teacherName}
                                                </div>
                                                <div className="opacity-60">
                                                    {b.duration}min
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Selected booking detail panel */}
            {selected && (
                <div className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="font-semibold">Booking Details</h3>
                            <div className="mt-2 grid gap-1 text-sm">
                                <p>
                                    <span className="text-muted-foreground">
                                        Student:
                                    </span>{" "}
                                    {selected.studentName}
                                </p>
                                <p>
                                    <span className="text-muted-foreground">
                                        Teacher:
                                    </span>{" "}
                                    {selected.teacherName}
                                </p>
                                <p>
                                    <span className="text-muted-foreground">
                                        Time:
                                    </span>{" "}
                                    {new Date(
                                        selected.scheduledAt
                                    ).toLocaleString("en-US", {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                                <p>
                                    <span className="text-muted-foreground">
                                        Duration:
                                    </span>{" "}
                                    {selected.duration} minutes
                                </p>
                                <p>
                                    <span className="text-muted-foreground">
                                        Status:
                                    </span>{" "}
                                    <span
                                        className={`ml-1 inline-block rounded border px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[selected.status]}`}
                                    >
                                        {selected.status}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedBookingId(null)}
                        >
                            Close
                        </Button>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/sessions/${selected.id}/room`}>
                                Enter Room
                            </Link>
                        </Button>
                        {selected.meetLink && (
                            <a
                                href={selected.meetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-primary underline underline-offset-4"
                            >
                                Join Meet
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs">
                {(
                    Object.entries(STATUS_COLORS) as [
                        BookingItem["status"],
                        string,
                    ][]
                ).map(([status, cls]) => (
                    <div key={status} className="flex items-center gap-1.5">
                        <div className={`h-3 w-3 rounded border ${cls}`} />
                        <span className="text-muted-foreground">
                            {status.charAt(0) + status.slice(1).toLowerCase()}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
