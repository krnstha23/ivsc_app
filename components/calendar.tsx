"use client";

import * as React from "react";
import {
  AltArrowLeft,
  AltArrowRight,
  AddCircle,
  ChecklistMinimalistic,
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
  // Keep keys stable across DST/timezones (matches Prisma @db.Date semantics).
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

export type CalendarProps = {
  onDayClick?: (date: Date) => void;
  /** Availability count per day ("YYYY-MM-DD"). Card is shown only when count > 0. */
  availabilityByDay?: Record<string, number>;
  onMonthChange?: (year: number, month: number) => void;
  /** Called when the availability card (slot count) is clicked. */
  onAvailabilityCardClick?: (date: Date) => void;
  /** Whether to show the add icon on hover for clickable cells. */
  showAddIcon?: boolean;
};

export function Calendar({
  onDayClick,
  availabilityByDay,
  onMonthChange,
  onAvailabilityCardClick,
  showAddIcon = false,
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
    [year, month]
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day;
  const isTodayOrLater = (day: number) => {
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return d.getTime() >= today.getTime();
  };

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
            const canClick = day != null && typeof onDayClick === "function";
            const canAdd = day != null && isTodayOrLater(day);
            const count =
              day != null && availabilityByDay
                ? availabilityByDay[dateKey(year, month, day)] ?? 0
                : 0;
            const showCard = count > 0;
            const cellClick =
              canClick && cellDate ? () => onDayClick(cellDate) : undefined;
            const cellClassName = cn(
              "group relative flex min-w-0 aspect-square min-h-0 items-start justify-start rounded-md p-2 text-sm transition-colors",
              day === null && "bg-transparent",
              day !== null &&
                "bg-background hover:bg-accent hover:text-accent-foreground",
              day !== null &&
                isToday(day) &&
                "bg-primary text-primary-foreground font-semibold hover:bg-primary/90 hover:text-primary-foreground",
              canClick && "cursor-pointer",
              showCard &&
                "border-2 border-foreground/25 dark:border-foreground/20"
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
                        if (e.key === "Enter" || e.key === " ") {
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
                    <span className="absolute left-2 top-2 z-[1]">{day}</span>
                    {showCard && (
                      <span
                        aria-hidden
                        className="absolute left-2 top-7 z-[1] block size-1.5 rounded-full bg-amber-500 md:hidden"
                      />
                    )}
                    {showCard && (
                      <div
                        className={cn(
                          "absolute inset-3 top-9 z-[2] hidden rounded-xl border-2 border-foreground/25 bg-background/70 text-card-foreground shadow-sm dark:border-foreground/20 md:block",
                          onAvailabilityCardClick && "cursor-pointer"
                        )}
                        role={onAvailabilityCardClick ? "button" : "presentation"}
                        tabIndex={onAvailabilityCardClick ? 0 : undefined}
                        onClick={
                          onAvailabilityCardClick && cellDate
                            ? (e) => {
                                e.stopPropagation();
                                onAvailabilityCardClick(cellDate);
                              }
                            : undefined
                        }
                        onKeyDown={
                          onAvailabilityCardClick && cellDate
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onAvailabilityCardClick(cellDate);
                                }
                              }
                            : undefined
                        }
                      >
                        <div className="relative flex h-full items-center justify-center">
                          <ChecklistMinimalistic
                            size={22}
                            className="size-5 text-foreground/60"
                          />
                          <div className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border-2 border-foreground/25 bg-background text-xs font-semibold tabular-nums text-foreground dark:border-foreground/20">
                            {count}
                          </div>
                        </div>
                      </div>
                    )}
                    {canClick && canAdd && showAddIcon && (
                      <span className="absolute inset-0 flex items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        <AddCircle size={24} className="size-6" />
                      </span>
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
