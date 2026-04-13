"use client";

import * as React from "react";
import { toast } from "sonner";
import { AddCircle } from "@solar-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  createAvailability,
  getTeacherAvailabilityForDay,
  getSessionTeacherProfileId,
  deleteAvailability,
  updateAvailability,
} from "@/app/(app)/teachers/actions";
import type { DaySlotWithTeacher } from "@/app/(app)/teachers/actions";
import {
  TeachersSlotFormDialog,
  type SlotFormPayload,
  type EditSlotPayload,
} from "@/components/teachers-slot-form-dialog";

function formatTime12(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  const h24 = Number(hStr ?? 0);
  const m = Number(mStr ?? 0);
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatDateTitle(date: Date): string {
  return date.toLocaleDateString("default", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function durationLabel(startTime: string, endTime: string): string {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const mins = ((eh ?? 0) * 60 + (em ?? 0)) - ((sh ?? 0) * 60 + (sm ?? 0));
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

function isTodayOrLater(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime() >= today.getTime();
}

export function TeacherDayAvailabilityDialog({
  open,
  onOpenChange,
  date,
  canManageSlots = false,
  onSlotsChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  canManageSlots?: boolean;
  onSlotsChanged?: () => void;
}) {
  const [slots, setSlots] = React.useState<DaySlotWithTeacher[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [myTeacherId, setMyTeacherId] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editPayload, setEditPayload] = React.useState<EditSlotPayload | null>(null);
  const [pending, setPending] = React.useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  const loadSlots = React.useCallback(async () => {
    if (!open || !date) {
      setSlots([]);
      return;
    }
    setLoading(true);
    try {
      const { slots: s } = await getTeacherAvailabilityForDay(date);
      setSlots(s);
    } finally {
      setLoading(false);
    }
  }, [open, date]);

  React.useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  React.useEffect(() => {
    if (open && canManageSlots) {
      getSessionTeacherProfileId().then(setMyTeacherId);
    } else {
      setMyTeacherId(null);
    }
  }, [open, canManageSlots]);

  const title =
    date != null
      ? `Availability \u2014 ${formatDateTitle(date)}`
      : "Availability";

  const canAdd = canManageSlots && date != null && isTodayOrLater(date);

  const isMine = (slot: DaySlotWithTeacher) =>
    myTeacherId != null && slot.teacherId === myTeacherId;

  const openEdit = (slot: DaySlotWithTeacher) => {
    if (!date) return;
    setEditPayload({
      id: slot.id,
      date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
    setEditOpen(true);
  };

  const handleCreate = async (payload: SlotFormPayload) => {
    setPending(true);
    const result = await createAvailability(payload);
    setPending(false);
    if (result.success) {
      toast.success("Availability created.");
      setCreateOpen(false);
      await loadSlots();
      onSlotsChanged?.();
    } else {
      toast.error(result.error);
    }
  };

  const handleUpdate = async (payload: EditSlotPayload) => {
    setPending(true);
    const result = await updateAvailability(payload);
    setPending(false);
    if (result.success) {
      toast.success("Availability updated.");
      setEditOpen(false);
      setEditPayload(null);
      await loadSlots();
      onSlotsChanged?.();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (slotId: string) => {
    setPending(true);
    const result = await deleteAvailability(slotId);
    setPending(false);
    setConfirmDeleteId(null);
    if (result.success) {
      toast.success("Availability removed.");
      await loadSlots();
      onSlotsChanged?.();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                Loading…
              </div>
            ) : slots.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No availability blocks for this day.
                </p>
                {canAdd && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1"
                    onClick={() => setCreateOpen(true)}
                  >
                    <AddCircle size={16} className="mr-1.5 size-4" />
                    Add block
                  </Button>
                )}
              </div>
            ) : (
              <>
                <ul className="space-y-2">
                  {slots.map((slot) => {
                    const mine = isMine(slot);
                    return (
                      <li
                        key={slot.id}
                        className="flex flex-col gap-2 rounded-lg border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold tabular-nums">
                              {formatTime12(slot.startTime)} –{" "}
                              {formatTime12(slot.endTime)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {durationLabel(slot.startTime, slot.endTime)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {slot.teacherName}
                            {slot.hasBooking && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                Has booking
                              </span>
                            )}
                          </p>
                        </div>

                        {mine && (
                          <div className="flex shrink-0 gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={pending || slot.hasBooking}
                              onClick={() => openEdit(slot)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={pending || slot.hasBooking}
                              onClick={() => setConfirmDeleteId(slot.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {canAdd && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setCreateOpen(true)}
                  >
                    <AddCircle size={16} className="mr-1.5 size-4" />
                    Add block
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TeachersSlotFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        selectedDate={date}
        onCreate={handleCreate}
        pending={pending}
      />

      <TeachersSlotFormDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditPayload(null);
        }}
        selectedDate={date}
        editingSlot={editPayload}
        onUpdate={handleUpdate}
        pending={pending}
      />

      <AlertDialog
        open={confirmDeleteId !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete availability block</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this availability block? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={() => {
                if (confirmDeleteId) handleDelete(confirmDeleteId);
              }}
            >
              {pending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
