"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/app/generated/prisma/enums";

function toUtcDateOnly(d: Date): Date {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function nextUtcDateOnly(d: Date): Date {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + 1));
}

function dateKeyUtc(d: Date): string {
    return toUtcDateOnly(d).toISOString().slice(0, 10);
}

/**
 * Returns booking count per day for the current user for the given month.
 * Students: their bookings (userId = me).
 * Teachers: bookings where they are the teacher.
 * Admins: all bookings (or could restrict; same as teachers if they have a profile).
 * Keys are "YYYY-MM-DD".
 */
export async function getBookingsByMonth(
    year: number,
    month: number
): Promise<Record<string, number>> {
    const session = await auth();
    if (!session?.user) return {};

    const start = new Date(Date.UTC(year, month, 1));
    const end = new Date(Date.UTC(year, month + 1, 1));
    const userId = (session.user as { id?: string }).id;
    const role = (session.user as { role?: string }).role;

    if (!userId) return {};

    const isTeacher =
        role === Role.TEACHER || role === Role.ADMIN;
    const teacherProfile =
        isTeacher
            ? await prisma.teacherProfile.findUnique({
                  where: { userId },
                  select: { id: true },
              })
            : null;

    const where: {
        scheduledAt: { gte: Date; lt: Date };
        userId?: string;
        teacherId?: string;
    } = {
        scheduledAt: { gte: start, lt: end },
    };

    if (role === Role.USER) {
        where.userId = userId;
    } else if (teacherProfile) {
        where.teacherId = teacherProfile.id;
    } else if (role === Role.ADMIN) {
        // Admin without teacher profile: show all bookings
        // (no extra filter)
    } else {
        return {};
    }

    const bookings = await prisma.booking.findMany({
        where,
        select: { scheduledAt: true },
    });

    const byDay: Record<string, number> = {};
    for (const b of bookings) {
        const key = dateKeyUtc(b.scheduledAt);
        byDay[key] = (byDay[key] ?? 0) + 1;
    }
    return byDay;
}

export type DayBookingItem = {
    id: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    teacherName: string;
    studentName: string;
    status: string;
    packageId: string | null;
    /** True when the viewer is a student (USER); used for reschedule UI. */
    viewerMayReschedule: boolean;
};

/**
 * Returns bookings for a single day for the current user.
 * Same role logic as getBookingsByMonth.
 */
export async function getBookingsForDay(
    date: Date
): Promise<DayBookingItem[]> {
    const session = await auth();
    if (!session?.user) return [];

    const start = toUtcDateOnly(date);
    const end = nextUtcDateOnly(date);
    const userId = (session.user as { id?: string }).id;
    const role = (session.user as { role?: string }).role;

    if (!userId) return [];

    const isTeacher = role === Role.TEACHER || role === Role.ADMIN;
    const teacherProfile = isTeacher
        ? await prisma.teacherProfile.findUnique({
              where: { userId },
              select: { id: true },
          })
        : null;

    const where: {
        scheduledAt: { gte: Date; lt: Date };
        userId?: string;
        teacherId?: string;
    } = {
        scheduledAt: { gte: start, lt: end },
    };

    if (role === Role.USER) {
        where.userId = userId;
    } else if (teacherProfile) {
        where.teacherId = teacherProfile.id;
    }
    // Admin without teacher profile: no filter, get all for that day

    const bookings = await prisma.booking.findMany({
        where,
        select: {
            id: true,
            scheduledAt: true,
            duration: true,
            status: true,
            packageId: true,
            teacher: {
                select: {
                    user: {
                        select: {
                            firstName: true,
                            middleName: true,
                            lastName: true,
                        },
                    },
                },
            },
            user: {
                select: {
                    firstName: true,
                    middleName: true,
                    lastName: true,
                },
            },
        },
        orderBy: { scheduledAt: "asc" },
    });

    const viewerMayReschedule = role === Role.USER;

    return bookings.map((b) => {
        const startDate = new Date(b.scheduledAt);
        const startMin =
            startDate.getUTCHours() * 60 + startDate.getUTCMinutes();
        const endMin = startMin + b.duration;
        const startTime = `${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`;
        const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
        return {
            id: b.id,
            startTime,
            endTime,
            durationMinutes: b.duration,
            teacherName: [b.teacher.user.firstName, b.teacher.user.middleName, b.teacher.user.lastName]
                .filter(Boolean)
                .join(" ")
                .trim() || "Teacher",
            studentName: [b.user.firstName, b.user.middleName, b.user.lastName]
                .filter(Boolean)
                .join(" ")
                .trim() || "Student",
            status: b.status,
            packageId: b.packageId,
            viewerMayReschedule,
        };
    });
}
