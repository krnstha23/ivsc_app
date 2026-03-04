"use client";

import * as React from "react";
import { toast } from "sonner";
import { Calendar } from "@/components/calendar";
import { TeachersSlotFormDialog } from "@/components/teachers-slot-form-dialog";
import { TeacherDayAvailabilityDialog } from "@/components/teacher-day-availability-dialog";
import {
  createAvailability,
  getTeacherAvailabilityForMonth,
} from "@/app/(app)/teachers/actions";

export function TeachersCalendarWithPopup() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [timelinePopupDate, setTimelinePopupDate] = React.useState<Date | null>(
    null,
  );
  const [pending, setPending] = React.useState(false);
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
    []
  );

  React.useEffect(() => {
    fetchAvailability(viewYear, viewMonth);
  }, [viewYear, viewMonth, fetchAvailability]);

  const handleMonthChange = React.useCallback((year: number, month: number) => {
    setViewYear(year);
    setViewMonth(month);
  }, []);

  const handleDayClick = React.useCallback((date: Date) => {
    setSelectedDate(date);
    setDialogOpen(true);
  }, []);

  const handleCreate = React.useCallback(
    async (payload: {
      date: Date;
      durationMinutes: number;
      time: string;
    }) => {
      setPending(true);
      const result = await createAvailability(payload);
      setPending(false);
      if (result.success) {
        toast.success("Availability created.");
        setDialogOpen(false);
        await fetchAvailability(viewYear, viewMonth);
      } else {
        toast.error(result.error);
      }
    },
    [fetchAvailability, viewYear, viewMonth]
  );

  return (
    <>
      <Calendar
        onDayClick={handleDayClick}
        availabilityByDay={availabilityByDay}
        onMonthChange={handleMonthChange}
        onAvailabilityCardClick={(date) => setTimelinePopupDate(date)}
      />
      <TeachersSlotFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedDate={selectedDate}
        onCreate={handleCreate}
        pending={pending}
      />
      <TeacherDayAvailabilityDialog
        open={timelinePopupDate !== null}
        onOpenChange={(open) => !open && setTimelinePopupDate(null)}
        date={timelinePopupDate}
      />
    </>
  );
}
