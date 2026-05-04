import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccess, type Role } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
    EmailSendLogTable,
    type EmailSendLogRow,
} from "@/components/email-send-log-table";
import { displayNameFromParts } from "@/lib/booking-mail";

const PAGE_SIZE = 1000;

export default async function EmailLogsPage() {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const role = (session.user as { role?: string }).role as Role | undefined;
    if (!canAccess(role, ["ADMIN"])) redirect("/dashboard");

    const logs = await prisma.emailSendLog.findMany({
        take: PAGE_SIZE,
        orderBy: { createdAt: "desc" },
        include: {
            user: {
                select: {
                    firstName: true,
                    middleName: true,
                    lastName: true,
                    email: true,
                },
            },
            booking: { select: { scheduledAt: true } },
            triggeredBy: {
                select: { userName: true },
            },
        },
    });

    const rows: EmailSendLogRow[] = logs.map((log) => ({
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        toEmail: log.toEmail,
        status: log.status,
        errorMessage: log.errorMessage,
        trigger: log.trigger,
        bookingId: log.bookingId,
        studentLabel: displayNameFromParts(
            log.user.firstName,
            log.user.lastName,
            log.user.middleName,
        ),
        scheduledAt: log.booking.scheduledAt.toISOString(),
        triggeredByLabel: log.triggeredBy?.userName ?? null,
    }));

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">Email delivery log</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Booking confirmation sends and resends. Failed rows include a
                    server error summary when SMTP rejects or misconfiguration
                    blocks mail.
                </p>
            </div>
            <div className="px-4 lg:px-6">
                <EmailSendLogTable rows={rows} />
            </div>
            {logs.length >= PAGE_SIZE ? (
                <p className="text-muted-foreground px-4 text-center text-xs lg:px-6">
                    Showing the most recent {PAGE_SIZE} attempts.
                </p>
            ) : null}
        </div>
    );
}
