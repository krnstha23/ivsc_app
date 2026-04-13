"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/app/generated/prisma/enums";

type ActionResult = { success: true } | { success: false; error: string };

async function getTeacherProfileId(userId: string): Promise<string | null> {
    const tp = await prisma.teacherProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    return tp?.id ?? null;
}

export async function setMeetLink(
    bookingId: string,
    meetLink: string,
): Promise<ActionResult> {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    const role = (session?.user as { role?: string })?.role;
    if (!userId) return { success: false, error: "You must be signed in." };

    const parsed = z.object({
        bookingId: z.string().uuid(),
        meetLink: z.string().url().min(1),
    }).safeParse({ bookingId, meetLink });

    if (!parsed.success) {
        return { success: false, error: "Invalid booking ID or meeting link." };
    }

    const booking = await prisma.booking.findUnique({
        where: { id: parsed.data.bookingId },
        select: { id: true, teacherId: true },
    });
    if (!booking) return { success: false, error: "Booking not found." };

    if (role === Role.TEACHER) {
        const tpId = await getTeacherProfileId(userId);
        if (tpId !== booking.teacherId) {
            return { success: false, error: "Not your booking." };
        }
    } else if (role !== Role.ADMIN) {
        return { success: false, error: "Only teachers can set the meeting link." };
    }

    await prisma.booking.update({
        where: { id: parsed.data.bookingId },
        data: { meetLink: parsed.data.meetLink },
    });

    revalidatePath(`/sessions/${parsed.data.bookingId}/room`);
    return { success: true };
}

export async function uploadWriting(formData: FormData): Promise<ActionResult> {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    const role = (session?.user as { role?: string })?.role;
    if (!userId) return { success: false, error: "You must be signed in." };
    if (role !== Role.USER) {
        return { success: false, error: "Only students can upload writing." };
    }

    const bookingId = formData.get("bookingId") as string | null;
    const file = formData.get("file") as File | null;

    if (!bookingId || !file) {
        return { success: false, error: "Missing booking ID or file." };
    }

    const idParsed = z.string().uuid().safeParse(bookingId);
    if (!idParsed.success) {
        return { success: false, error: "Invalid booking ID." };
    }

    if (file.type !== "application/pdf") {
        return { success: false, error: "Only PDF files are allowed." };
    }

    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
        return { success: false, error: "File size must be under 10 MB." };
    }

    const booking = await prisma.booking.findUnique({
        where: { id: idParsed.data },
        select: { id: true, userId: true, writingSubmission: { select: { id: true } } },
    });
    if (!booking) return { success: false, error: "Booking not found." };
    if (booking.userId !== userId) {
        return { success: false, error: "Not your booking." };
    }
    if (booking.writingSubmission) {
        return { success: false, error: "Writing already submitted." };
    }

    const uploadsDir = join(process.cwd(), "uploads", "writings");
    await mkdir(uploadsDir, { recursive: true });

    const safeFileName = `${idParsed.data}-${Date.now()}.pdf`;
    const filePath = join(uploadsDir, safeFileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    await prisma.writingSubmission.create({
        data: {
            bookingId: idParsed.data,
            filePath: `uploads/writings/${safeFileName}`,
            fileName: file.name,
            fileSize: file.size,
        },
    });

    revalidatePath(`/sessions/${idParsed.data}/room`);
    return { success: true };
}

export async function submitEvaluation(
    bookingId: string,
    score: number,
    feedback: string,
): Promise<ActionResult> {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    const role = (session?.user as { role?: string })?.role;
    if (!userId) return { success: false, error: "You must be signed in." };

    const parsed = z.object({
        bookingId: z.string().uuid(),
        score: z.number().int().min(0).max(100),
        feedback: z.string().min(1).max(5000),
    }).safeParse({ bookingId, score, feedback });

    if (!parsed.success) {
        return { success: false, error: "Invalid input. Score must be 0-100 and feedback is required." };
    }

    const booking = await prisma.booking.findUnique({
        where: { id: parsed.data.bookingId },
        select: {
            id: true,
            teacherId: true,
            evaluation: { select: { id: true } },
        },
    });
    if (!booking) return { success: false, error: "Booking not found." };
    if (booking.evaluation) {
        return { success: false, error: "Evaluation already submitted." };
    }

    if (role === Role.TEACHER) {
        const tpId = await getTeacherProfileId(userId);
        if (tpId !== booking.teacherId) {
            return { success: false, error: "Not your booking." };
        }
    } else if (role !== Role.ADMIN) {
        return { success: false, error: "Only teachers can submit evaluations." };
    }

    await prisma.evaluation.create({
        data: {
            bookingId: parsed.data.bookingId,
            score: parsed.data.score,
            feedback: parsed.data.feedback,
        },
    });

    revalidatePath(`/sessions/${parsed.data.bookingId}/room`);
    return { success: true };
}
