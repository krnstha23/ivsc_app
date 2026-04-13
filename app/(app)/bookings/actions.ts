"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/app/generated/prisma/enums";

export type CompleteBookingResult =
    | { success: true }
    | { success: false; error: string };

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

    revalidatePath("/bookings/teaching");
    revalidatePath("/calendar");
    return { success: true };
}
