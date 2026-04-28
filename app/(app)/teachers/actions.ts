"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@/app/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    createAvailabilitySchema,
    updateAvailabilitySchema,
    firstError,
} from "@/lib/validations";

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

function padTime(timeStr: string): string {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return timeStr;
    return `${match[1]!.padStart(2, "0")}:${match[2]}`;
}

function timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToTime(mins: number): string {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** True if [startA, endA) and [startB, endB) overlap (touching endpoints do not overlap). */
function intervalsOverlapMinutes(
    startA: number,
    endA: number,
    startB: number,
    endB: number,
): boolean {
    return startA < endB && startB < endA;
}

/**
 * When adding a new block, merge it with any same-day unbooked blocks that overlap
 * so teachers can extend windows without hitting an implicit "no overlap" failure.
 * If an overlapping row has a booking, returns an error instead.
 */
async function mergeOverlappingUnbookedBlocks(params: {
    teacherId: string;
    dateOnly: Date;
    startTime: string;
    endTime: string;
}): Promise<
    | { ok: true; mergedStart: string; mergedEnd: string; deleteIds: string[] }
    | { ok: false; error: string }
> {
    const sNew = timeToMinutes(padTime(params.startTime));
    const eNew = timeToMinutes(padTime(params.endTime));

    const rows = await prisma.availability.findMany({
        where: {
            teacherId: params.teacherId,
            date: params.dateOnly,
        },
        select: {
            id: true,
            startTime: true,
            endTime: true,
            booking: { select: { id: true } },
        },
    });

    const overlapping = rows.filter((row) => {
        const s = timeToMinutes(padTime(row.startTime));
        const e = timeToMinutes(padTime(row.endTime));
        return intervalsOverlapMinutes(sNew, eNew, s, e);
    });

    for (const row of overlapping) {
        if (row.booking) {
            return {
                ok: false,
                error: "This time overlaps a block that already has a booking. Cancel the booking or choose a different time.",
            };
        }
    }

    let minS = sNew;
    let maxE = eNew;
    for (const row of overlapping) {
        const s = timeToMinutes(padTime(row.startTime));
        const e = timeToMinutes(padTime(row.endTime));
        minS = Math.min(minS, s);
        maxE = Math.max(maxE, e);
    }

    return {
        ok: true,
        mergedStart: minutesToTime(minS),
        mergedEnd: minutesToTime(maxE),
        deleteIds: overlapping.map((r) => r.id),
    };
}

async function updateWouldOverlapOtherBlock(params: {
    teacherId: string;
    dateOnly: Date;
    excludeId: string;
    startTime: string;
    endTime: string;
}): Promise<boolean> {
    const sNew = timeToMinutes(padTime(params.startTime));
    const eNew = timeToMinutes(padTime(params.endTime));

    const rows = await prisma.availability.findMany({
        where: {
            teacherId: params.teacherId,
            date: params.dateOnly,
            NOT: { id: params.excludeId },
        },
        select: { startTime: true, endTime: true },
    });

    for (const row of rows) {
        const s = timeToMinutes(padTime(row.startTime));
        const e = timeToMinutes(padTime(row.endTime));
        if (intervalsOverlapMinutes(sNew, eNew, s, e)) return true;
    }
    return false;
}

export type BundleAvailabilitySlot = {
    id: string;
    teacherId: string;
    teacherName: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
};

export type ApprovedTeacherOption = {
    teacherId: string;
    teacherName: string;
};

/** Returns bookable availability slots for a bundle on a single date. */
export async function getAvailableSlotsForBundle(
    bundleId: string,
    date: Date
): Promise<BundleAvailabilitySlot[]> {
    const session = await auth();
    if (!session?.user) return [];

    const start = toUtcDateOnly(date);
    const end = nextUtcDateOnly(date);

    const slots = await prisma.availability.findMany({
        where: {
            date: { gte: start, lt: end },
            booking: null,
            OR: [
                { bundleIds: { isEmpty: true } },
                { bundleIds: { has: bundleId } },
            ],
        },
        select: {
            id: true,
            startTime: true,
            endTime: true,
            teacherId: true,
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
        },
        orderBy: { startTime: "asc" },
    });

    return slots.map((s) => {
        const durationMinutes =
            timeToMinutes(s.endTime) - timeToMinutes(s.startTime);
        return {
            id: s.id,
            teacherId: s.teacherId,
            teacherName: [
                s.teacher.user.firstName,
                s.teacher.user.middleName,
                s.teacher.user.lastName,
            ]
                .filter(Boolean)
                .join(" ")
                .trim() || "Teacher",
            startTime: s.startTime,
            endTime: s.endTime,
            durationMinutes,
        };
    });
}

export async function createAvailability(payload: {
    date: Date;
    startTime: string;
    endTime: string;
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

    const { date, startTime, endTime } = parsed.data;

    const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId },
    });
    if (!teacherProfile) {
        return { success: false, error: "Teacher profile not found." };
    }
    if (!teacherProfile.isApproved) {
        return {
            success: false,
            error: "Your account is pending admin approval. You cannot create availability yet.",
        };
    }

    const dateOnly = toUtcDateOnly(date);

    const merge = await mergeOverlappingUnbookedBlocks({
        teacherId: teacherProfile.id,
        dateOnly,
        startTime,
        endTime,
    });
    if (!merge.ok) {
        return { success: false, error: merge.error };
    }

    await prisma.$transaction(async (tx) => {
        if (merge.deleteIds.length > 0) {
            await tx.availability.deleteMany({
                where: { id: { in: merge.deleteIds } },
            });
        }
        await tx.availability.create({
            data: {
                teacherId: teacherProfile.id,
                date: dateOnly,
                startTime: padTime(merge.mergedStart),
                endTime: padTime(merge.mergedEnd),
                bundleIds: [],
            },
        });
    });

    revalidatePath("/teachers");
    revalidatePath("/calendar");
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

export type DaySlotWithTeacher = DaySlot & {
    teacherName: string;
    teacherId: string;
    hasBooking: boolean;
};

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
            teacherId: true,
            booking: { select: { id: true } },
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
            teacherId: s.teacherId,
            hasBooking: s.booking != null,
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

export async function getSessionTeacherProfileId(): Promise<string | null> {
    const session = await auth();
    if (!session?.user) return null;
    const role = (session.user as { role?: string }).role;
    if (role !== Role.TEACHER && role !== Role.ADMIN) return null;
    const userId = (session.user as { id?: string }).id;
    if (!userId) return null;
    const tp = await prisma.teacherProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    return tp?.id ?? null;
}

export async function getApprovedTeachersForAdmin(): Promise<ApprovedTeacherOption[]> {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (role !== Role.ADMIN) return [];

    const teachers = await prisma.teacherProfile.findMany({
        where: { isApproved: true, isActive: true, user: { isActive: true } },
        select: {
            id: true,
            user: {
                select: {
                    firstName: true,
                    middleName: true,
                    lastName: true,
                    userName: true,
                },
            },
        },
        orderBy: [
            { user: { firstName: "asc" } },
            { user: { lastName: "asc" } },
        ],
    });

    return teachers.map((teacher) => {
        const fullName =
            [teacher.user.firstName, teacher.user.middleName, teacher.user.lastName]
                .filter(Boolean)
                .join(" ")
                .trim() || teacher.user.userName;

        return {
            teacherId: teacher.id,
            teacherName: `${fullName} (@${teacher.user.userName})`,
        };
    });
}

export type MutateSlotResult =
    | { success: true }
    | { success: false; error: string };

export async function deleteAvailability(
    availabilityId: string
): Promise<MutateSlotResult> {
    const session = await auth();
    const user = session?.user;
    if (!user) {
        return { success: false, error: "You must be signed in." };
    }
    const role = (user as { role?: string }).role;
    const userId = (user as { id?: string }).id;
    if (!userId) {
        return { success: false, error: "Invalid session." };
    }

    const slot = await prisma.availability.findUnique({
        where: { id: availabilityId },
        select: { id: true, teacherId: true, booking: { select: { id: true } } },
    });
    if (!slot) {
        return { success: false, error: "Slot not found." };
    }
    if (slot.booking) {
        return {
            success: false,
            error: "This slot has a booking. Cancel the booking first.",
        };
    }

    if (role === Role.ADMIN) {
        await prisma.availability.delete({ where: { id: availabilityId } });
        revalidatePath("/teachers");
        revalidatePath("/teachers/manage");
        revalidatePath("/calendar");
        return { success: true };
    }

    if (role !== Role.TEACHER) {
        return {
            success: false,
            error: "Only teachers or admins can delete availability.",
        };
    }

    const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!teacherProfile) {
        return { success: false, error: "Teacher profile not found." };
    }
    if (slot.teacherId !== teacherProfile.id) {
        return { success: false, error: "Slot not found or not yours." };
    }

    await prisma.availability.delete({ where: { id: availabilityId } });
    revalidatePath("/teachers");
    revalidatePath("/calendar");
    return { success: true };
}

export async function approveTeacherFromManage(
    userId: string
): Promise<MutateSlotResult> {
    const session = await auth();
    const user = session?.user;
    if (!user) return { success: false, error: "You must be signed in." };

    if ((user as { role?: string }).role !== Role.ADMIN) {
        return { success: false, error: "Only admins can approve teachers." };
    }

    const profile = await prisma.teacherProfile.findUnique({
        where: { userId },
        select: { id: true, isApproved: true },
    });
    if (!profile) {
        return { success: false, error: "Teacher profile not found." };
    }

    await prisma.teacherProfile.update({
        where: { id: profile.id },
        data: { isApproved: true },
    });

    revalidatePath("/teachers/manage");
    revalidatePath("/users");
    return { success: true };
}

export async function toggleTeacherActive(
    teacherId: string
): Promise<MutateSlotResult> {
    const session = await auth();
    const user = session?.user;
    if (!user) return { success: false, error: "You must be signed in." };

    if ((user as { role?: string }).role !== Role.ADMIN) {
        return { success: false, error: "Only admins can toggle teacher status." };
    }

    const teacher = await prisma.teacherProfile.findUnique({
        where: { id: teacherId },
        select: { id: true, isActive: true },
    });
    if (!teacher) {
        return { success: false, error: "Teacher profile not found." };
    }

    await prisma.teacherProfile.update({
        where: { id: teacherId },
        data: { isActive: !teacher.isActive },
    });

    revalidatePath("/teachers/manage");
    revalidatePath("/teachers");
    return { success: true };
}

export async function adminCreateAvailability(payload: {
    teacherId: string;
    date: Date;
    startTime: string;
    endTime: string;
}): Promise<CreateAvailabilityResult> {
    const session = await auth();
    const user = session?.user;
    if (!user) return { success: false, error: "You must be signed in." };

    if ((user as { role?: string }).role !== Role.ADMIN) {
        return {
            success: false,
            error: "Only admins can create availability on behalf of teachers.",
        };
    }

    const { teacherId, ...rest } = payload;

    const parsed = createAvailabilitySchema.safeParse(rest);
    if (!parsed.success) {
        return { success: false, error: firstError(parsed.error) };
    }

    const { date, startTime, endTime } = parsed.data;

    const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { id: teacherId },
        select: { id: true, isApproved: true, isActive: true },
    });
    if (!teacherProfile) {
        return { success: false, error: "Teacher profile not found." };
    }
    if (!teacherProfile.isApproved) {
        return {
            success: false,
            error: "Availability can only be created for approved teachers.",
        };
    }
    if (!teacherProfile.isActive) {
        return {
            success: false,
            error: "Availability can only be created for active teachers.",
        };
    }

    const dateOnly = toUtcDateOnly(date);

    const merge = await mergeOverlappingUnbookedBlocks({
        teacherId,
        dateOnly,
        startTime,
        endTime,
    });
    if (!merge.ok) {
        return { success: false, error: merge.error };
    }

    await prisma.$transaction(async (tx) => {
        if (merge.deleteIds.length > 0) {
            await tx.availability.deleteMany({
                where: { id: { in: merge.deleteIds } },
            });
        }
        await tx.availability.create({
            data: {
                teacherId,
                date: dateOnly,
                startTime: padTime(merge.mergedStart),
                endTime: padTime(merge.mergedEnd),
                bundleIds: [],
            },
        });
    });

    revalidatePath("/teachers");
    revalidatePath("/teachers/manage");
    revalidatePath("/calendar");
    return { success: true };
}

export async function updateAvailability(payload: {
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
}): Promise<MutateSlotResult> {
    const session = await auth();
    const user = session?.user;
    if (!user) {
        return { success: false, error: "You must be signed in." };
    }
    const role = (user as { role?: string }).role;
    const userId = (user as { id?: string }).id;
    if (!userId) {
        return { success: false, error: "Invalid session." };
    }

    const parsed = updateAvailabilitySchema.safeParse(payload);
    if (!parsed.success) {
        return { success: false, error: firstError(parsed.error) };
    }

    const { id, date, startTime, endTime } = parsed.data;

    const slot = await prisma.availability.findUnique({
        where: { id },
        select: {
            id: true,
            teacherId: true,
            booking: { select: { id: true } },
        },
    });
    if (!slot) {
        return { success: false, error: "Slot not found." };
    }
    if (slot.booking) {
        return {
            success: false,
            error: "This slot has a booking and cannot be changed.",
        };
    }

    const dateOnly = toUtcDateOnly(date);
    if (
        await updateWouldOverlapOtherBlock({
            teacherId: slot.teacherId,
            dateOnly,
            excludeId: id,
            startTime,
            endTime,
        })
    ) {
        return {
            success: false,
            error: "This range overlaps another availability block that day. Adjust the times or edit the other block.",
        };
    }

    const updateData = {
        date: dateOnly,
        startTime: padTime(startTime),
        endTime: padTime(endTime),
    };

    if (role === Role.ADMIN) {
        await prisma.availability.update({
            where: { id },
            data: updateData,
        });
        revalidatePath("/teachers");
        revalidatePath("/teachers/manage");
        revalidatePath("/calendar");
        return { success: true };
    }

    if (role !== Role.TEACHER) {
        return {
            success: false,
            error: "Only teachers or admins can update availability.",
        };
    }

    const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!teacherProfile) {
        return { success: false, error: "Teacher profile not found." };
    }
    if (slot.teacherId !== teacherProfile.id) {
        return { success: false, error: "Slot not found or not yours." };
    }

    await prisma.availability.update({
        where: { id },
        data: updateData,
    });

    revalidatePath("/teachers");
    revalidatePath("/calendar");
    return { success: true };
}
