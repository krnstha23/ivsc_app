"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pen } from "@solar-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateEnrollment } from "./actions";

export function EnrollmentActions({
  enrollmentId,
  currentClassesTotal,
  currentStatus,
}: {
  enrollmentId: string;
  currentClassesTotal: number;
  currentStatus: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [classesTotal, setClassesTotal] = React.useState(currentClassesTotal);
  const [status, setStatus] = React.useState(currentStatus);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");

    const data: { classesTotal?: number; status?: string } = {};
    if (classesTotal !== currentClassesTotal) data.classesTotal = classesTotal;
    if (status !== currentStatus) data.status = status;

    const result = await updateEnrollment(enrollmentId, data);
    setPending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Edit enrollment">
          <Pen size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Enrollment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="classesTotal">Total Classes</Label>
            <Input
              id="classesTotal"
              type="number"
              min={1}
              value={classesTotal}
              onChange={(e) => setClassesTotal(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
