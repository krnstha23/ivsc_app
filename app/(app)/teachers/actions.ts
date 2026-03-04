"use server";

import { Role } from "@/app/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export type CreateAvailabilityResult =
    | { success: true }
    | { success: false; error: string };

/**
 * Parse "HH:MM" and add minutes. Returns "HH:MM".
 */
function addMinutesToTime(timeStr: string, addMinutes: number): string {
    const [h, m] = timeStr.split(":").map(Number);
    const totalMinutes = (h ?? 0) * 60 + (m ?? 0) + addMinutes;
    const outHours = Math.floor(totalMinutes / 60) % 24;
    const outMinutes = totalMinutes % 60;
    return `${String(outHours).padStart(2, "0")}:${String(outMinutes).padStart(2, "0")}`;
}

export async function createAvailability(payload: {
    date: Date;
    durationMinutes: number;
    time: string;
}): Promise<CreateAvailabilityResult> {
    const session = await auth();
    const user = session?.user;

    if (!user) {
        return {
            success: false,
            error: "You must be signed in to create availability.",
        };
    }

    const role = (user as { role?: string }).role;
    if (role !== Role.TEACHER) {
        return {
            success: false,
            error: "Only teacher can create availability.",
        };
    }

    const userId = (user as { id?: string }).id;
    if (!userId) {
        return { success: false, error: "Invalid session." };
    }

    const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId },
    });

    if (!teacherProfile) {
        return {
            success: false,
            error: "Only teacher can create availability.",
        };
    }

    const { date, durationMinutes, time } = payload;
    const timeTrimmed = time.trim();
    const timeMatch = timeTrimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeMatch) {
        return { success: false, error: "Invalid time format." };
    }
    const startTime = `${timeMatch[1].padStart(2, "0")}:${timeMatch[2].padStart(2, "0")}`;
    const endTime = addMinutesToTime(startTime, durationMinutes);

    const dateOnly = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
    );

    await prisma.availability.create({
        data: {
            teacherId: teacherProfile.id,
            date: dateOnly,
            startTime,
            endTime,
        },
    });

    return { success: true };
}

/**
 * Returns availability count per day for the signed-in teacher only (current user's TeacherProfile).
 * Keys are "YYYY-MM-DD". Non-teachers or unauthenticated users get an empty map.
 */
export async function getTeacherAvailabilityForMonth(
    year: number,
    month: number
): Promise<Record<string, number>> {
    const session = await auth();
    const user = session?.user;
    if (!user) return {};

    const role = (user as { role?: string }).role;
    if (role !== Role.TEACHER) return {};

    const userId = (user as { id?: string }).id;
    if (!userId) return {};

    const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId },
    });
    if (!teacherProfile) return {};

    const loggedInTeacherId = teacherProfile.id;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    const slots = await prisma.availability.findMany({
        where: {
            teacherId: loggedInTeacherId,
            date: { gte: start, lte: end },
        },
        select: { date: true },
    });

    const byDay: Record<string, number> = {};
    for (const s of slots) {
        const d = new Date(s.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        byDay[key] = (byDay[key] ?? 0) + 1;
    }
    return byDay;
}

export type DaySlot = { id: string; startTime: string; endTime: string };

export type TeacherDayAvailabilityResult = {
    teacherName: string;
    slots: DaySlot[];
};

/**
 * Returns availability slots and display name for the signed-in teacher for a single day.
 * Used to render the 24hr timeline popup (logged-in teacher only).
 */
export async function getTeacherAvailabilityForDay(
    date: Date
): Promise<TeacherDayAvailabilityResult> {
    const session = await auth();
    const user = session?.user;
    if (!user) return { teacherName: "", slots: [] };

    const role = (user as { role?: string }).role;
    if (role !== Role.TEACHER) return { teacherName: "", slots: [] };

    const userId = (user as { id?: string }).id;
    if (!userId) return { teacherName: "", slots: [] };

    const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId },
        include: {
            user: {
                select: {
                    firstName: true,
                    middleName: true,
                    lastName: true,
                },
            },
        },
    });
    if (!teacherProfile) return { teacherName: "", slots: [] };

    const teacherName = [
        teacherProfile.user.firstName,
        teacherProfile.user.middleName,
        teacherProfile.user.lastName,
    ]
        .filter(Boolean)
        .join(" ")
        .trim() || "Teacher";

    const dateOnly = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
    );

    const slots = await prisma.availability.findMany({
        where: {
            teacherId: teacherProfile.id,
            date: dateOnly,
        },
        select: { id: true, startTime: true, endTime: true },
        orderBy: { startTime: "asc" },
    });

    return {
        teacherName,
        slots: slots.map((s) => ({
            id: s.id,
            startTime: s.startTime,
            endTime: s.endTime,
        })),
    };
}
