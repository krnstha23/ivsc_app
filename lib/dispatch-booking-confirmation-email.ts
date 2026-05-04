import {
    displayNameFromParts,
    resolveBookingRecipientEmail,
    sendBookingConfirmedEmail,
    type BookingConfirmationMailPayload,
} from "@/lib/booking-mail";
import { prisma } from "@/lib/prisma";
import {
    EmailSendTrigger,
    EmailSendType,
    EmailSendStatus,
} from "@/app/generated/prisma/enums";

type DispatchCtx = {
    trigger: "BOOKING_CONFIRM" | "ADMIN_RESEND";
    triggeredByUserId: string | null;
};

async function resolvePackageOrBundleLabel(
    packageId: string | null,
    bundleId: string | null,
    packageName: string | null | undefined,
): Promise<string> {
    if (packageName?.trim()) return packageName.trim();
    if (bundleId) {
        const b = await prisma.packageBundle.findUnique({
            where: { id: bundleId },
            select: { name: true },
        });
        if (b?.name.trim()) return b.name.trim();
    }
    return "Session";
}

/**
 * Sends booking confirmation email and appends an EmailSendLog row.
 * Safe to call after the booking is CONFIRMED; does not throw on SMTP failure.
 */
export async function dispatchBookingConfirmationEmail(
    bookingId: string,
    ctx: DispatchCtx,
): Promise<void> {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            user: {
                select: {
                    email: true,
                    firstName: true,
                    middleName: true,
                    lastName: true,
                },
            },
            teacher: {
                include: {
                    user: {
                        select: {
                            firstName: true,
                            middleName: true,
                            lastName: true,
                        },
                    },
                },
            },
            package: { select: { name: true } },
        },
    });

    if (!booking || booking.status !== "CONFIRMED") {
        return;
    }

    const to = resolveBookingRecipientEmail(booking);
    if (!to) {
        await prisma.emailSendLog.create({
            data: {
                bookingId: booking.id,
                userId: booking.userId,
                type: EmailSendType.BOOKING_CONFIRMED,
                toEmail: "(none)",
                status: EmailSendStatus.FAILED,
                errorMessage: "No recipient email (student email and account email are missing).",
                trigger:
                    ctx.trigger === "ADMIN_RESEND"
                        ? EmailSendTrigger.ADMIN_RESEND
                        : EmailSendTrigger.BOOKING_CONFIRM,
                triggeredByUserId: ctx.triggeredByUserId,
            },
        });
        return;
    }

    const packageOrBundleLabel = await resolvePackageOrBundleLabel(
        booking.packageId,
        booking.bundleId,
        booking.package?.name,
    );

    const studentDisplayName = displayNameFromParts(
        booking.user.firstName,
        booking.user.lastName,
        booking.user.middleName,
    );
    const teacherDisplayName = displayNameFromParts(
        booking.teacher.user.firstName,
        booking.teacher.user.lastName,
        booking.teacher.user.middleName,
    );

    const payload: BookingConfirmationMailPayload = {
        to,
        studentDisplayName,
        scheduledAt: booking.scheduledAt,
        durationMinutes: booking.duration,
        teacherDisplayName,
        packageOrBundleLabel,
        meetLink: booking.meetLink,
    };

    const result = await sendBookingConfirmedEmail(payload);

    await prisma.emailSendLog.create({
        data: {
            bookingId: booking.id,
            userId: booking.userId,
            type: EmailSendType.BOOKING_CONFIRMED,
            toEmail: to,
            status: result.ok ? EmailSendStatus.SENT : EmailSendStatus.FAILED,
            errorMessage: result.ok ? null : result.error,
            trigger:
                ctx.trigger === "ADMIN_RESEND"
                    ? EmailSendTrigger.ADMIN_RESEND
                    : EmailSendTrigger.BOOKING_CONFIRM,
            triggeredByUserId: ctx.triggeredByUserId,
        },
    });
}
