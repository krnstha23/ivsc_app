"use client";

import * as React from "react";
import {
    AltArrowLeft,
    AltArrowRight,
} from "@solar-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const daysInMonth = last.getDate();
    const startDay = first.getDay();
    return { daysInMonth, startDay };
}

function getCalendarGrid(year: number, month: number) {
    const { daysInMonth, startDay } = getDaysInMonth(year, month);
    const cells: (number | null)[] = [];

    for (let i = 0; i < startDay; i++) {
        cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push(d);
    }

    return cells;
}

function dateKey(year: number, month: number, day: number): string {
    return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

export type CalendarProps = {
    onDayClick?: (date: Date) => void;
    /** Map of "YYYY-MM-DD" → positive number. Days with a value > 0 show an indicator. */
    availabilityByDay?: Record<string, number>;
    onMonthChange?: (year: number, month: number) => void;
};

export function Calendar({
    onDayClick,
    availabilityByDay,
    onMonthChange,
}: CalendarProps = {}) {
    const [viewDate, setViewDate] = React.useState(() => new Date());
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthLabel = viewDate.toLocaleString("default", {
        month: "long",
        year: "numeric",
    });

    const grid = React.useMemo(
        () => getCalendarGrid(year, month),
        [year, month],
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = (day: number) =>
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === day;

    const goPrev = () => {
        const next = new Date(year, month - 1);
        setViewDate(next);
        onMonthChange?.(next.getFullYear(), next.getMonth());
    };

    const goNext = () => {
        const next = new Date(year, month + 1);
        setViewDate(next);
        onMonthChange?.(next.getFullYear(), next.getMonth());
    };

    const goToToday = () => {
        const t = new Date();
        setViewDate(t);
        onMonthChange?.(t.getFullYear(), t.getMonth());
    };

    return (
        <div className="mx-auto w-full max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="flex flex-col gap-4 p-4 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold">{monthLabel}</h2>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={goPrev}
                                aria-label="Previous month"
                            >
                                <AltArrowLeft size={16} className="size-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={goToToday}
                                className="min-w-[4rem]"
                            >
                                Today
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={goNext}
                                aria-label="Next month"
                            >
                                <AltArrowRight size={16} className="size-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="grid w-full max-w-full grid-cols-7 gap-px rounded-md bg-muted/50 p-2">
                        {WEEKDAYS.map((day) => (
                            <div
                                key={day}
                                className="min-w-0 py-2 text-center text-xs font-medium text-muted-foreground"
                            >
                                {day}
                            </div>
                        ))}
                        {grid.map((day, i) => {
                            const cellDate =
                                day != null ? new Date(year, month, day) : null;
                            const canClick =
                                day != null && typeof onDayClick === "function";
                            const hasAvailability =
                                day != null && availabilityByDay
                                    ? (availabilityByDay[
                                          dateKey(year, month, day)
                                      ] ?? 0) > 0
                                    : false;
                            const cellClick =
                                canClick && cellDate
                                    ? () => onDayClick(cellDate)
                                    : undefined;
                            const cellClassName = cn(
                                "group relative flex min-w-0 aspect-square min-h-0 items-start justify-start rounded-md p-2 text-sm transition-colors",
                                day === null && "bg-transparent",
                                day !== null &&
                                    "bg-background hover:bg-accent hover:text-accent-foreground",
                                day !== null &&
                                    isToday(day) &&
                                    "bg-primary text-primary-foreground font-semibold hover:bg-primary/90 hover:text-primary-foreground",
                                canClick && "cursor-pointer",
                            );
                            return (
                                <div
                                    key={i}
                                    role={canClick ? "button" : undefined}
                                    tabIndex={canClick ? 0 : undefined}
                                    onClick={cellClick}
                                    onKeyDown={
                                        canClick && cellDate
                                            ? (e) => {
                                                  if (
                                                      e.key === "Enter" ||
                                                      e.key === " "
                                                  ) {
                                                      e.preventDefault();
                                                      onDayClick(cellDate);
                                                  }
                                              }
                                            : undefined
                                    }
                                    className={cellClassName}
                                >
                                    {day != null ? (
                                        <>
                                            <span className="absolute left-2 top-2 z-[1]">
                                                {day}
                                            </span>
                                            {hasAvailability && (
                                                <span
                                                    aria-hidden
                                                    className="absolute right-2 top-2 z-[1] block size-2 rounded-full bg-amber-500"
                                                />
                                            )}
                                        </>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
