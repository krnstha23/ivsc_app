"use client";

import * as React from "react";
import { AltArrowLeft, AltArrowRight } from "@solar-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 10); // 10–21 (10am–9pm)

function getWeekStart(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeekRangeLabel(weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const startStr = weekStart.toLocaleDateString("default", {
    month: "short",
    day: "numeric",
  });
  const endStr = weekEnd.toLocaleDateString("default", {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startStr} – ${endStr}`;
}

export function CalendarWeekView() {
  const [viewDate, setViewDate] = React.useState(() => new Date());
  const weekStart = React.useMemo(
    () => getWeekStart(viewDate),
    [viewDate]
  );

  const weekDays = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const today = new Date();
  const isToday = (d: Date) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const goPrev = () => {
    setViewDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const goNext = () => {
    setViewDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const goToToday = () => {
    setViewDate(new Date());
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            {getWeekRangeLabel(weekStart)}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={goPrev}
              aria-label="Previous week"
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
              aria-label="Next week"
            >
              <AltArrowRight size={16} className="size-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Day headers */}
            <div className="grid grid-cols-8 border-b bg-muted/30 text-sm">
              <div className="border-r p-2 text-muted-foreground" />
              {weekDays.map((d) => (
                <div
                  key={d.toISOString()}
                  className={cn(
                    "flex flex-col items-center border-r p-2 last:border-r-0",
                    isToday(d) && "bg-primary/10 font-semibold text-primary"
                  )}
                >
                  <span className="text-xs text-muted-foreground">
                    {WEEKDAYS[d.getDay()]}
                  </span>
                  <span className="text-base">{d.getDate()}</span>
                </div>
              ))}
            </div>
            {/* Time grid */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="grid grid-cols-8 border-b border-border/60 text-sm last:border-b-0"
              >
                <div className="border-r p-1.5 text-right text-xs text-muted-foreground">
                  {hour === 12 ? "12pm" : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
                </div>
                {weekDays.map((d) => (
                  <div
                    key={d.toISOString()}
                    className={cn(
                      "min-h-12 border-r bg-background last:border-r-0",
                      isToday(d) && "bg-primary/5"
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
