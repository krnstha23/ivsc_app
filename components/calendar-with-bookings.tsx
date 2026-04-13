"use client";

import * as React from "react";
import { Calendar } from "@/components/calendar";
import { DayBookingsDialog } from "@/components/day-bookings-dialog";
import { getBookingsByMonth } from "@/app/(app)/calendar/actions";

export function CalendarWithBookings() {
    const [viewDialogDate, setViewDialogDate] = React.useState<Date | null>(null);
    const [bookingsByDay, setBookingsByDay] = React.useState<
        Record<string, number>
    >({});
    const [viewYear, setViewYear] = React.useState(() => new Date().getFullYear());
    const [viewMonth, setViewMonth] = React.useState(() => new Date().getMonth());

    const fetchBookings = React.useCallback(
        async (year: number, month: number) => {
            const data = await getBookingsByMonth(year, month);
            setBookingsByDay(data);
        },
        [],
    );

    React.useEffect(() => {
        fetchBookings(viewYear, viewMonth);
    }, [viewYear, viewMonth, fetchBookings]);

    const handleMonthChange = React.useCallback((year: number, month: number) => {
        setViewYear(year);
        setViewMonth(month);
    }, []);

    const handleDayClick = React.useCallback((date: Date) => {
        setViewDialogDate(date);
    }, []);

    return (
        <>
            <Calendar
                onDayClick={handleDayClick}
                availabilityByDay={bookingsByDay}
                onMonthChange={handleMonthChange}
            />

            <DayBookingsDialog
                open={viewDialogDate !== null}
                onOpenChange={(open) => !open && setViewDialogDate(null)}
                date={viewDialogDate}
            />
        </>
    );
}
