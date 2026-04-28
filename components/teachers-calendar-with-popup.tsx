"use client";

import * as React from "react";
import { Calendar } from "@/components/calendar";
import { TeacherDayAvailabilityDialog } from "@/components/teacher-day-availability-dialog";
import { getTeacherAvailabilityForMonth } from "@/app/(app)/teachers/actions";

export function TeachersCalendarWithPopup({
  canCreate = false,
  isAdmin = false,
}: {
  canCreate?: boolean;
  isAdmin?: boolean;
}) {
  const [viewDialogDate, setViewDialogDate] = React.useState<Date | null>(null);
  const [availabilityByDay, setAvailabilityByDay] = React.useState<
    Record<string, number>
  >({});
  const [viewYear, setViewYear] = React.useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = React.useState(() => new Date().getMonth());

  const fetchAvailability = React.useCallback(
    async (year: number, month: number) => {
      const data = await getTeacherAvailabilityForMonth(year, month);
      setAvailabilityByDay(data);
    },
    [],
  );

  React.useEffect(() => {
    fetchAvailability(viewYear, viewMonth);
  }, [viewYear, viewMonth, fetchAvailability]);

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
        availabilityByDay={availabilityByDay}
        onMonthChange={handleMonthChange}
      />

      <TeacherDayAvailabilityDialog
        open={viewDialogDate !== null}
        onOpenChange={(open) => !open && setViewDialogDate(null)}
        date={viewDialogDate}
        canManageSlots={canCreate}
        isAdmin={isAdmin}
        onSlotsChanged={() => fetchAvailability(viewYear, viewMonth)}
      />
    </>
  );
}
