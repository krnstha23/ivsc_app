"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { resendBookingConfirmationAsAdmin } from "@/app/(app)/email-logs/actions";

export type EmailSendLogRow = {
    id: string;
    createdAt: string;
    toEmail: string;
    status: "SENT" | "FAILED";
    errorMessage: string | null;
    trigger: "BOOKING_CONFIRM" | "ADMIN_RESEND";
    bookingId: string;
    studentLabel: string;
    scheduledAt: string;
    triggeredByLabel: string | null;
};

const whenFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    dateStyle: "medium",
    timeStyle: "short",
});

export function EmailSendLogTable({ rows }: { rows: EmailSendLogRow[] }) {
    const router = useRouter();
    const [resendRow, setResendRow] = React.useState<EmailSendLogRow | null>(
        null,
    );
    const [confirmEmail, setConfirmEmail] = React.useState("");
    const [busy, setBusy] = React.useState(false);

    React.useEffect(() => {
        if (resendRow) {
            setConfirmEmail(resendRow.toEmail === "(none)" ? "" : resendRow.toEmail);
        }
    }, [resendRow]);

    async function copyErrorToClipboard(text: string) {
        try {
            await navigator.clipboard.writeText(text);
            toast.success("Error copied to clipboard");
        } catch {
            toast.error("Could not copy to clipboard");
        }
    }

    async function onResendSubmit() {
        if (!resendRow) return;
        setBusy(true);
        const res = await resendBookingConfirmationAsAdmin(
            resendRow.bookingId,
            confirmEmail.trim(),
        );
        setBusy(false);
        if (!res.success) {
            toast.error(res.error);
            return;
        }
        toast.success("Confirmation email sent.");
        setResendRow(null);
        router.refresh();
    }

    return (
        <TooltipProvider delayDuration={200}>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>When (Nepal)</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Session</TableHead>
                            <TableHead>To</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Error</TableHead>
                            <TableHead>Trigger</TableHead>
                            <TableHead>By</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={9}
                                    className="text-muted-foreground py-10 text-center text-sm"
                                >
                                    No email attempts yet. Confirm a pending
                                    booking to send the first message.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell className="whitespace-nowrap text-sm">
                                        {whenFmt.format(new Date(row.createdAt))}
                                    </TableCell>
                                    <TableCell className="max-w-[140px] truncate text-sm">
                                        {row.studentLabel}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-sm">
                                        {whenFmt.format(
                                            new Date(row.scheduledAt),
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-[180px] truncate font-mono text-xs">
                                        {row.toEmail}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                row.status === "SENT"
                                                    ? "secondary"
                                                    : "destructive"
                                            }
                                            className="capitalize"
                                        >
                                            {row.status.toLowerCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground max-w-[200px] text-xs">
                                        {row.errorMessage ? (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        type="button"
                                                        title="Hover for full message; click to copy"
                                                        className="block max-w-[200px] cursor-pointer truncate border-0 bg-transparent p-0 text-left underline decoration-dotted decoration-muted-foreground/50 underline-offset-2 text-inherit"
                                                        onClick={() =>
                                                            void copyErrorToClipboard(
                                                                row.errorMessage!,
                                                            )
                                                        }
                                                    >
                                                        {row.errorMessage}
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent
                                                    side="top"
                                                    sideOffset={6}
                                                    className="max-h-[min(70vh,24rem)] max-w-lg overflow-y-auto text-left [text-wrap:wrap] break-words whitespace-pre-wrap"
                                                >
                                                    {row.errorMessage}
                                                </TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            "—"
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {row.trigger === "BOOKING_CONFIRM"
                                            ? "Confirm"
                                            : "Resend"}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground max-w-[120px] truncate text-sm">
                                        {row.triggeredByLabel ?? "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={
                                                row.toEmail === "(none)" ||
                                                busy
                                            }
                                            onClick={() => setResendRow(row)}
                                        >
                                            Resend
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog
                open={resendRow !== null}
                onOpenChange={(open) => !open && !busy && setResendRow(null)}
            >
                <DialogContent
                    onPointerDownOutside={(e) =>
                        busy && e.preventDefault()
                    }
                >
                    <DialogHeader>
                        <DialogTitle>Resend confirmation email</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm">
                        Type the recipient address exactly as it should receive
                        the email. It must match the student&apos;s booking
                        email (or account email if none was set on the
                        booking).
                    </p>
                    <div className="grid gap-2">
                        <Label htmlFor="confirm-email">Recipient email</Label>
                        <Input
                            id="confirm-email"
                            type="email"
                            autoComplete="email"
                            value={confirmEmail}
                            onChange={(e) => setConfirmEmail(e.target.value)}
                            disabled={busy}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => !busy && setResendRow(null)}
                            disabled={busy}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={() => void onResendSubmit()}
                            disabled={busy || !confirmEmail.trim()}
                        >
                            {busy ? "Sending…" : "Send"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
}
