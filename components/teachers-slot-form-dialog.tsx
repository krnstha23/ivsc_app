"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatDateForInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type SlotFormPayload = {
  date: Date;
  startTime: string;
  endTime: string;
  teacherId?: string;
};

export type EditSlotPayload = SlotFormPayload & { id: string };
type TeacherOption = { teacherId: string; teacherName: string };

export function TeachersSlotFormDialog({
  open,
  onOpenChange,
  selectedDate,
  editingSlot,
  onCreate,
  onUpdate,
  showTeacherSelect = false,
  teacherOptions = [],
  pending = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  editingSlot?: EditSlotPayload | null;
  onCreate?: (payload: SlotFormPayload) => void;
  onUpdate?: (payload: EditSlotPayload) => void;
  showTeacherSelect?: boolean;
  teacherOptions?: TeacherOption[];
  pending?: boolean;
}) {
  const [startTime, setStartTime] = React.useState("09:00");
  const [endTime, setEndTime] = React.useState("17:00");
  const [teacherId, setTeacherId] = React.useState("");

  const isEdit = Boolean(editingSlot);

  React.useEffect(() => {
    if (open) {
      if (editingSlot) {
        setStartTime(editingSlot.startTime);
        setEndTime(editingSlot.endTime);
      } else {
        setStartTime("09:00");
        setEndTime("17:00");
        setTeacherId((current) => current || teacherOptions[0]?.teacherId || "");
      }
    }
  }, [open, editingSlot, teacherOptions]);

  const resolvedDate = editingSlot?.date ?? selectedDate;
  const dateStr = resolvedDate ? formatDateForInput(resolvedDate) : "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedDate) return;
    if (isEdit && editingSlot) {
      onUpdate?.({ id: editingSlot.id, date: resolvedDate, startTime, endTime });
    } else {
      if (showTeacherSelect && !teacherId) return;
      onCreate?.({
        date: resolvedDate,
        startTime,
        endTime,
        teacherId: showTeacherSelect ? teacherId : undefined,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[90vh] flex-col sm:max-w-md"
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {isEdit ? "Edit availability block" : "Add availability block"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            <FieldGroup>
              {showTeacherSelect && !isEdit && (
                <Field>
                  <FieldLabel htmlFor="slot-teacher">Teacher</FieldLabel>
                  <Select
                    value={teacherId}
                    onValueChange={setTeacherId}
                    disabled={pending || teacherOptions.length === 0}
                  >
                    <SelectTrigger id="slot-teacher">
                      <SelectValue placeholder="Select an approved teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teacherOptions.map((teacher) => (
                        <SelectItem
                          key={teacher.teacherId}
                          value={teacher.teacherId}
                        >
                          {teacher.teacherName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {teacherOptions.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No approved teachers available.
                    </p>
                  )}
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="slot-date">Date</FieldLabel>
                <Input
                  id="slot-date"
                  type="date"
                  value={dateStr}
                  disabled
                  className="bg-muted"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="slot-start">Start time</FieldLabel>
                  <Input
                    id="slot-start"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    disabled={pending}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="slot-end">End time</FieldLabel>
                  <Input
                    id="slot-end"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    disabled={pending}
                  />
                </Field>
              </div>

              <p className="text-xs text-muted-foreground">
                Define a continuous block. The system will generate bookable
                session slots from this block based on each bundle&apos;s
                duration with a 10-minute gap between sessions.
              </p>
            </FieldGroup>
          </div>

          <DialogFooter className="shrink-0 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                pending ||
                !resolvedDate ||
                (showTeacherSelect && !isEdit && !teacherId)
              }
            >
              {pending
                ? "Saving…"
                : isEdit
                  ? "Save changes"
                  : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
