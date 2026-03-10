"use server";

import { Role } from "@/app/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAvailabilitySchema, firstError } from "@/lib/validations";

export type CreateAvailabilityResult =
    | { success: true }
    | { success: false; error: string };

function toUtcDateOnly(d: Date): Date {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function nextUtcDateOnly(d: Date): Date {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + 1));
}

function dateKeyUtc(d: Date): string {
    return toUtcDateOnly(d).toISOString().slice(0, 10);
}

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
        return { success: false, error: "You must be signed in." };
    }

    const role = (user as { role?: string }).role;
    if (role !== Role.TEACHER) {
        return { success: false, error: "Only teachers can create availability." };
    }

    const userId = (user as { id?: string }).id;
    if (!userId) {
        return { success: false, error: "Invalid session." };
    }

    const parsed = createAvailabilitySchema.safeParse(payload);
    if (!parsed.success) {
        return { success: false, error: firstError(parsed.error) };
    }

    const { date, durationMinutes, time } = parsed.data;

    const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId },
    });
    if (!teacherProfile) {
        return { success: false, error: "Teacher profile not found." };
    }

    const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeMatch) {
        return { success: false, error: "Invalid time format." };
    }
    const startTime = `${timeMatch[1].padStart(2, "0")}:${timeMatch[2].padStart(2, "0")}`;
    const endTime = addMinutesToTime(startTime, durationMinutes);

    // Availability.date is stored as @db.Date (no time). Normalize in UTC to avoid DST/timezone edge cases.
    const dateOnly = toUtcDateOnly(date);

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
 * Returns availability count per day across all teachers.
 * Visible to any authenticated user. Keys are "YYYY-MM-DD".
 */
export async function getTeacherAvailabilityForMonth(
    year: number,
    month: number
): Promise<Record<string, number>> {
    const session = await auth();
    if (!session?.user) return {};

    // Use a half-open UTC range [start, end) for stability across DST/timezones.
    const start = new Date(Date.UTC(year, month, 1));
    const end = new Date(Date.UTC(year, month + 1, 1));

    const slots = await prisma.availability.findMany({
        where: {
            date: { gte: start, lt: end },
        },
        select: { date: true },
    });

    const byDay: Record<string, number> = {};
    for (const s of slots) {
        const key = dateKeyUtc(s.date);
        byDay[key] = (byDay[key] ?? 0) + 1;
    }
    return byDay;
}

export type DaySlot = { id: string; startTime: string; endTime: string };

export type TeacherDayAvailabilityResult = {
    teacherName: string;
    slots: DaySlot[];
};

export type DaySlotWithTeacher = DaySlot & { teacherName: string };

/**
 * Returns all teachers' availability slots for a single day.
 * Visible to any authenticated user.
 */
export async function getTeacherAvailabilityForDay(
    date: Date
): Promise<{ slots: DaySlotWithTeacher[] }> {
    const session = await auth();
    if (!session?.user) return { slots: [] };

    const start = toUtcDateOnly(date);
    const end = nextUtcDateOnly(date);

    const slots = await prisma.availability.findMany({
        where: { date: { gte: start, lt: end } },
        select: {
            id: true,
            startTime: true,
            endTime: true,
            teacher: {
                select: {
                    user: {
                        select: { firstName: true, middleName: true, lastName: true },
                    },
                },
            },
        },
        orderBy: { startTime: "asc" },
    });

    return {
        slots: slots.map((s) => ({
            id: s.id,
            startTime: s.startTime,
            endTime: s.endTime,
            teacherName: [
                s.teacher.user.firstName,
                s.teacher.user.middleName,
                s.teacher.user.lastName,
            ]
                .filter(Boolean)
                .join(" ")
                .trim() || "Teacher",
        })),
    };
}
