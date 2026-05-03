"use client";

import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    confirmPendingBooking,
    rejectPendingBooking,
} from "@/app/(app)/bookings/actions";

export type PendingBookingRow = {
    id: string;
    scheduledAt: string;
    duration: number;
    studentName: string;
    teacherName: string;
    bundleOrPackageLabel: string;
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
});

const timeFmt = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
});

export function AdminPendingBookings({ bookings }: { bookings: PendingBookingRow[] }) {
    const [rejectId, setRejectId] = React.useState<string | null>(null);
    const [reason, setReason] = React.useState("");
    const [busy, setBusy] = React.useState(false);

    async function onConfirm(id: string) {
        setBusy(true);
        const res = await confirmPendingBooking(id);
        setBusy(false);
        if (!res.success) {
            toast.error(res.error);
            return;
        }
        toast.success("Booking confirmed.");
    }

    async function onRejectSubmit() {
        if (!rejectId) return;
        const r = reason.trim();
        if (!r) {
            toast.error("Please enter a rejection reason.");
            return;
        }
        setBusy(true);
        const res = await rejectPendingBooking(rejectId, r);
        setBusy(false);
        if (!res.success) {
            toast.error(res.error);
            return;
        }
        toast.success("Booking rejected.");
        setRejectId(null);
        setReason("");
    }

    if (bookings.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">No pending booking requests.</p>
        );
    }

    return (
        <>
            <div className="hidden md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>When</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Teacher</TableHead>
                            <TableHead>Bundle / package</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bookings.map((b) => (
                            <TableRow key={b.id}>
                                <TableCell>
                                    {dateFmt.format(new Date(b.scheduledAt))}
                                    <br />
                                    <span className="text-muted-foreground text-xs">
                                        {timeFmt.format(new Date(b.scheduledAt))} ·{" "}
                                        {b.duration} min
                                    </span>
                                </TableCell>
                                <TableCell>{b.studentName}</TableCell>
                                <TableCell>{b.teacherName}</TableCell>
                                <TableCell>{b.bundleOrPackageLabel}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            size="sm"
                                            disabled={busy}
                                            onClick={() => onConfirm(b.id)}
                                        >
                                            Confirm
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            disabled={busy}
                                            onClick={() => {
                                                setRejectId(b.id);
                                                setReason("");
                                            }}
                                        >
                                            Reject
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex flex-col gap-3 md:hidden">
                {bookings.map((b) => (
                    <div
                        key={b.id}
                        className="flex flex-col gap-2 rounded-lg border p-4"
                    >
                        <div className="flex items-center justify-between">
                            <Badge variant="outline">PENDING</Badge>
                        </div>
                        <p className="text-sm">
                            {dateFmt.format(new Date(b.scheduledAt))} at{" "}
                            {timeFmt.format(new Date(b.scheduledAt))}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {b.studentName} → {b.teacherName}
                        </p>
                        <p className="text-sm">{b.bundleOrPackageLabel}</p>
                        <div className="flex gap-2 pt-2">
                            <Button
                                size="sm"
                                className="flex-1"
                                disabled={busy}
                                onClick={() => onConfirm(b.id)}
                            >
                                Confirm
                            </Button>
                            <Button
                                size="sm"
                                variant="destructive"
                                className="flex-1"
                                disabled={busy}
                                onClick={() => {
                                    setRejectId(b.id);
                                    setReason("");
                                }}
                            >
                                Reject
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={rejectId !== null} onOpenChange={(o) => !o && setRejectId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject booking</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-2 py-2">
                        <Label htmlFor="reject-reason">Reason (required)</Label>
                        <Input
                            id="reject-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Explain why this booking is rejected"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectId(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" disabled={busy} onClick={onRejectSubmit}>
                            Confirm rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
