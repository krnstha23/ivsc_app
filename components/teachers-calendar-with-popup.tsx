"use client";

import * as React from "react";
import { toast } from "sonner";
import { ChecklistMinimalistic } from "@solar-icons/react";
import { Calendar } from "@/components/calendar";
import { TeachersSlotFormDialog } from "@/components/teachers-slot-form-dialog";
import { TeacherDayAvailabilityDialog } from "@/components/teacher-day-availability-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  createAvailability,
  getTeacherAvailabilityForMonth,
} from "@/app/(app)/teachers/actions";

function useIsDesktop(breakpoint = 768) {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);

  return isDesktop;
}

export function TeachersCalendarWithPopup({
  canCreate = false,
}: {
  canCreate?: boolean;
}) {
  const isDesktop = useIsDesktop();
  const canCreateOnMobile = false;
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [actionSheetOpen, setActionSheetOpen] = React.useState(false);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [viewDialogDate, setViewDialogDate] = React.useState<Date | null>(null);
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

  const isTodayOrLater = React.useCallback((d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.getTime() >= today.getTime();
  }, []);

  const selectedDateKey = React.useMemo(() => {
    if (!selectedDate) return "";
    return new Date(
      Date.UTC(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
      ),
    )
      .toISOString()
      .slice(0, 10);
  }, [selectedDate]);

  const selectedDaySlotCount = availabilityByDay[selectedDateKey] ?? 0;

  // Desktop: cell click → create dialog directly
  // Mobile: cell click → action sheet
  const handleDayClick = React.useCallback(
    (date: Date) => {
      setSelectedDate(date);
      if (isDesktop) {
        if (canCreate && isTodayOrLater(date)) setCreateDialogOpen(true);
      } else {
        setActionSheetOpen(true);
      }
    },
    [isDesktop, canCreate, isTodayOrLater]
  );

  // Desktop only: card click → view dialog directly
  const handleCardClick = React.useCallback((date: Date) => {
    setViewDialogDate(date);
  }, []);

  const handleViewSlots = () => {
    setActionSheetOpen(false);
    setViewDialogDate(selectedDate);
  };

  const handleAddSlot = () => {
    setActionSheetOpen(false);
    setCreateDialogOpen(true);
  };

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
        setCreateDialogOpen(false);
        await fetchAvailability(viewYear, viewMonth);
      } else {
        toast.error(result.error);
      }
    },
    [fetchAvailability, viewYear, viewMonth]
  );

  const formattedDate = selectedDate
    ? selectedDate.toLocaleDateString("default", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <>
      <Calendar
        onDayClick={handleDayClick}
        availabilityByDay={availabilityByDay}
        onMonthChange={handleMonthChange}
        onAvailabilityCardClick={isDesktop ? handleCardClick : undefined}
        showAddIcon={canCreate && isDesktop}
      />

      {/* Mobile: action sheet */}
      <Sheet open={actionSheetOpen} onOpenChange={setActionSheetOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="rounded-t-xl">
          <SheetHeader className="pb-2">
            <SheetTitle>{formattedDate}</SheetTitle>
            <SheetDescription>
              {selectedDaySlotCount > 0
                ? selectedDaySlotCount === 1
                  ? "1 availability"
                  : `${selectedDaySlotCount} availabilities`
                : "No availability yet"}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2 px-4 pb-4">
            {selectedDaySlotCount > 0 && (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 text-base"
                onClick={handleViewSlots}
              >
                <ChecklistMinimalistic size={20} className="size-5" />
                View availability
              </Button>
            )}
            {/* Disabled on smaller devices per requirement */}
            {canCreate && canCreateOnMobile && selectedDate && isTodayOrLater(selectedDate) && (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 text-base"
                onClick={handleAddSlot}
              >
                Add availability
              </Button>
            )}
            <Button
              variant="ghost"
              className="w-full h-12 text-base"
              onClick={() => setActionSheetOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Create slot dialog */}
      {canCreate && (
        <TeachersSlotFormDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          selectedDate={selectedDate}
          onCreate={handleCreate}
          pending={pending}
        />
      )}

      {/* Day timeline dialog */}
      <TeacherDayAvailabilityDialog
        open={viewDialogDate !== null}
        onOpenChange={(open) => !open && setViewDialogDate(null)}
        date={viewDialogDate}
      />
    </>
  );
}
