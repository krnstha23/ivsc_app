"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/app/generated/prisma/enums";
import { firstError } from "@/lib/validations";
import { dispatchBookingConfirmationEmail } from "@/lib/dispatch-booking-confirmation-email";

export type CompleteBookingResult =
    | { success: true }
    | { success: false; error: string };

export type AdminBookingActionResult =
    | { success: true }
    | { success: false; error: string };

export async function completeBookingFromForm(
    formData: FormData,
): Promise<void> {
    const raw = formData.get("bookingId");
    const id = typeof raw === "string" ? raw : "";
    const parsed = z.string().uuid().safeParse(id);
    if (!parsed.success) {
        return;
    }
    await completeBooking(parsed.data);
}

export async function completeBooking(
    bookingId: string
): Promise<CompleteBookingResult> {
    const session = await auth();
    const user = session?.user;
    if (!user) return { success: false, error: "You must be signed in." };

    const role = (user as { role?: string }).role;
    if (role !== Role.TEACHER) {
        return { success: false, error: "Only teachers can complete bookings." };
    }

    const userId = (user as { id?: string }).id;
    if (!userId) return { success: false, error: "Invalid session." };

    const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!teacherProfile) {
        return { success: false, error: "Teacher profile not found." };
    }

    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, teacherId: true, status: true },
    });
    if (!booking || booking.teacherId !== teacherProfile.id) {
        return {
            success: false,
            error: "Booking not found or not assigned to you.",
        };
    }
    if (booking.status !== "CONFIRMED") {
        return {
            success: false,
            error: "Only confirmed bookings can be completed.",
        };
    }

    await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "COMPLETED" },
    });

    revalidatePath("/bookings");
    revalidatePath("/calendar");
    return { success: true };
}

const rejectReasonSchema = z.object({
    bookingId: z.string().uuid(),
    reason: z.string().min(1, "A rejection reason is required.").max(2000),
});

export async function confirmPendingBooking(
    bookingId: string
): Promise<AdminBookingActionResult> {
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: "You must be signed in." };
    }
    if ((session.user as { role?: string }).role !== Role.ADMIN) {
        return { success: false, error: "Only administrators can confirm bookings." };
    }

    const idParsed = z.string().uuid().safeParse(bookingId);
    if (!idParsed.success) {
        return { success: false, error: "Invalid booking." };
    }

    const booking = await prisma.booking.findUnique({
        where: { id: idParsed.data },
        select: { id: true, status: true },
    });
    if (!booking || booking.status !== "PENDING") {
        return { success: false, error: "This booking is not pending." };
    }

    await prisma.booking.update({
        where: { id: booking.id },
        data: {
            status: "CONFIRMED",
            paymentStatus: "PAID",
        },
    });

    const adminId = (session.user as { id?: string }).id ?? null;
    await dispatchBookingConfirmationEmail(booking.id, {
        trigger: "BOOKING_CONFIRM",
        triggeredByUserId: adminId,
    });

    revalidatePath("/bookings");
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    revalidatePath("/email-logs");
    return { success: true };
}

export async function rejectPendingBooking(
    bookingId: string,
    reason: string
): Promise<AdminBookingActionResult> {
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: "You must be signed in." };
    }
    if ((session.user as { role?: string }).role !== Role.ADMIN) {
        return { success: false, error: "Only administrators can reject bookings." };
    }

    const parsed = rejectReasonSchema.safeParse({ bookingId, reason });
    if (!parsed.success) {
        return { success: false, error: firstError(parsed.error) };
    }

    const booking = await prisma.booking.findUnique({
        where: { id: parsed.data.bookingId },
        select: { id: true, status: true, notes: true },
    });
    if (!booking || booking.status !== "PENDING") {
        return { success: false, error: "This booking is not pending." };
    }

    const reasonLine = `[REJECTED] ${parsed.data.reason.trim()}`;
    const newNotes = booking.notes
        ? `${booking.notes}\n${reasonLine}`
        : reasonLine;

    await prisma.booking.update({
        where: { id: booking.id },
        data: {
            status: "CANCELLED",
            paymentStatus: "FAILED",
            notes: newNotes,
        },
    });

    revalidatePath("/bookings");
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    return { success: true };
}
