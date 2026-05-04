"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/app/generated/prisma/enums";
import { dispatchBookingConfirmationEmail } from "@/lib/dispatch-booking-confirmation-email";
import {
    normalizeEmail,
    resolveBookingRecipientEmail,
} from "@/lib/booking-mail";
import { firstError } from "@/lib/validations";

export type ResendBookingEmailResult =
    | { success: true }
    | { success: false; error: string };

const resendSchema = z.object({
    bookingId: z.string().uuid(),
    confirmedRecipientEmail: z
        .string()
        .min(1, "Enter the recipient email to confirm.")
        .email("Enter a valid email address."),
});

export async function resendBookingConfirmationAsAdmin(
    bookingId: string,
    confirmedRecipientEmail: string,
): Promise<ResendBookingEmailResult> {
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: "You must be signed in." };
    }
    if ((session.user as { role?: string }).role !== Role.ADMIN) {
        return { success: false, error: "Only administrators can resend email." };
    }

    const parsed = resendSchema.safeParse({ bookingId, confirmedRecipientEmail });
    if (!parsed.success) {
        return { success: false, error: firstError(parsed.error) };
    }

    const adminId = (session.user as { id?: string }).id ?? null;
    if (!adminId) {
        return { success: false, error: "Invalid session." };
    }

    const booking = await prisma.booking.findUnique({
        where: { id: parsed.data.bookingId },
        include: {
            user: { select: { email: true } },
        },
    });

    if (!booking) {
        return { success: false, error: "Booking not found." };
    }
    if (booking.status !== "CONFIRMED") {
        return {
            success: false,
            error: "Only confirmed bookings can receive this confirmation email.",
        };
    }

    const expected = resolveBookingRecipientEmail(booking);
    if (!expected) {
        return {
            success: false,
            error:
                "No recipient email on file for this booking. Update student email on the booking or account.",
        };
    }

    if (
        normalizeEmail(parsed.data.confirmedRecipientEmail) !==
        normalizeEmail(expected)
    ) {
        return {
            success: false,
            error:
                "The email you entered does not match the recipient for this booking. Check and try again.",
        };
    }

    await dispatchBookingConfirmationEmail(booking.id, {
        trigger: "ADMIN_RESEND",
        triggeredByUserId: adminId,
    });

    revalidatePath("/email-logs");
    return { success: true };
}
