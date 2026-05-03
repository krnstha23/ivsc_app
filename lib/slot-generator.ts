/**
 * Core scheduling engine: slot generation from teacher availability blocks,
 * lead-time category computation, and teacher assignment algorithm.
 */

import { prisma } from "@/lib/prisma";
import { getBsWeekBounds } from "@/lib/bikram-sambat";

const NPT_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
const GAP_MINUTES = 10;

// ─── Time helpers ────────────────────────────────────────────────

export function timeToMinutes(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesToTime(mins: number): string {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function toUtcDateOnly(d: Date): Date {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function nextUtcDateOnly(d: Date): Date {
    return new Date(
        Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + 1),
    );
}

// ─── Types ───────────────────────────────────────────────────────

export type GeneratedSlot = {
    teacherId: string;
    startTime: string; // "HH:MM"
    endTime: string;
    availabilityId: string; // parent availability block
};

export type LeadTimeCategory = "STANDARD" | "PRIORITY" | "INSTANT";

// ─── Slot Generation ─────────────────────────────────────────────

/**
 * Given a date and bundle, finds all teacher availability blocks compatible
 * with the bundle, partitions each into segments of `bundle.duration` minutes,
 * and excludes segments overlapping existing bookings + 10-min gap.
 *
 * Returns available segments with `teacherId` (no teacher name).
 */
export async function generateSlots(
    date: Date,
    bundleId: string,
): Promise<GeneratedSlot[]> {
    const bundle = await prisma.packageBundle.findUnique({
        where: { id: bundleId },
        select: { duration: true, isActive: true },
    });
    if (!bundle?.isActive) return [];

    const dateStart = toUtcDateOnly(date);
    const dateEnd = nextUtcDateOnly(date);

    const availabilities = await prisma.availability.findMany({
        where: {
            date: { gte: dateStart, lt: dateEnd },
            teacher: { isActive: true, isApproved: true },
            OR: [
                { bundleIds: { isEmpty: true } },
                { bundleIds: { has: bundleId } },
            ],
        },
        select: {
            id: true,
            teacherId: true,
            startTime: true,
            endTime: true,
            booking: { select: { id: true } },
        },
    });

    // Only partition unbooked availability blocks (source windows)
    const sourceBlocks = availabilities.filter((a) => !a.booking);
    if (sourceBlocks.length === 0) return [];

    const teacherIds = [...new Set(sourceBlocks.map((a) => a.teacherId))];

    // All non-cancelled bookings for these teachers on this date (for gap check)
    const bookings = await prisma.booking.findMany({
        where: {
            teacherId: { in: teacherIds },
            scheduledAt: { gte: dateStart, lt: dateEnd },
            status: { not: "CANCELLED" },
        },
        select: { teacherId: true, scheduledAt: true, duration: true },
    });

    const bookedByTeacher = new Map<
        string,
        { start: number; end: number }[]
    >();
    for (const b of bookings) {
        const s =
            b.scheduledAt.getUTCHours() * 60 +
            b.scheduledAt.getUTCMinutes();
        const list = bookedByTeacher.get(b.teacherId) ?? [];
        list.push({ start: s, end: s + b.duration });
        bookedByTeacher.set(b.teacherId, list);
    }

    const dur = bundle.duration;
    const seen = new Set<string>();
    const slots: GeneratedSlot[] = [];

    for (const block of sourceBlocks) {
        const blockStart = timeToMinutes(block.startTime);
        const blockEnd = timeToMinutes(block.endTime);
        const booked = bookedByTeacher.get(block.teacherId) ?? [];

        for (let c = blockStart; c + dur <= blockEnd; c += dur) {
            const segEnd = c + dur;

            // Conflict: segment overlaps any booked range including gap buffer
            const conflict = booked.some(
                (b) =>
                    c < b.end + GAP_MINUTES &&
                    segEnd > b.start - GAP_MINUTES,
            );
            if (conflict) continue;

            // Deduplicate across overlapping availability blocks
            const key = `${block.teacherId}:${c}`;
            if (seen.has(key)) continue;
            seen.add(key);

            slots.push({
                teacherId: block.teacherId,
                startTime: minutesToTime(c),
                endTime: minutesToTime(segEnd),
                availabilityId: block.id,
            });
        }
    }

    return slots.sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
    );
}

// ─── Lead-Time Category ──────────────────────────────────────────

/**
 * Determines the booking lead-time category based on UTC+5:45 rules:
 * - INSTANT:  booking confirmation and session start on the same civil day (NPT)
 * - STANDARD: ≥ 48 h before session start
 * - PRIORITY: ≥ 24 h and < 48 h before session start
 * - Fallback (< 24 h, different day): INSTANT
 */
export function computeLeadTimeCategory(
    confirmationTime: Date,
    sessionStartTime: Date,
): LeadTimeCategory {
    const cNpt = new Date(confirmationTime.getTime() + NPT_OFFSET_MS);
    const sNpt = new Date(sessionStartTime.getTime() + NPT_OFFSET_MS);

    const sameDay =
        cNpt.getUTCFullYear() === sNpt.getUTCFullYear() &&
        cNpt.getUTCMonth() === sNpt.getUTCMonth() &&
        cNpt.getUTCDate() === sNpt.getUTCDate();

    if (sameDay) return "INSTANT";

    const hours =
        (sessionStartTime.getTime() - confirmationTime.getTime()) / 3_600_000;
    if (hours >= 48) return "STANDARD";
    if (hours >= 24) return "PRIORITY";
    return "INSTANT";
}

// ─── Teacher Assignment ──────────────────────────────────────────

/**
 * Assigns the best teacher from `eligibleTeacherIds` for a session on `date`.
 *
 * Policy: lowest confirmed-session count in the current BS week
 * (Sunday–Saturday in UTC+5:45). Alphabetical `teacherId` breaks ties.
 */
export async function assignTeacher(
    eligibleTeacherIds: string[],
    date: Date,
): Promise<string> {
    if (eligibleTeacherIds.length === 1) return eligibleTeacherIds[0];

    const { start, end } = getBsWeekBounds(date);

    const rows = await prisma.booking.findMany({
        where: {
            teacherId: { in: eligibleTeacherIds },
            status: { not: "CANCELLED" },
            scheduledAt: { gte: start, lt: end },
        },
        select: { teacherId: true },
    });

    const counts = new Map<string, number>();
    for (const r of rows)
        counts.set(r.teacherId, (counts.get(r.teacherId) ?? 0) + 1);

    return eligibleTeacherIds
        .map((id) => ({ id, n: counts.get(id) ?? 0 }))
        .sort((a, b) => a.n - b.n || a.id.localeCompare(b.id))[0].id;
}
