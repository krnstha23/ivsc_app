/**
 * Auto-assigns a writing question to a booking.
 *
 * Policy:
 *  1. Prefer questions the student has never been assigned before (random pick).
 *  2. If all active questions have been seen, pick the one assigned the fewest
 *     times to this student (least-used fallback).
 *  3. Returns null if the question bank is empty.
 *
 * Must be called inside a Prisma transaction so the assignment is atomic with
 * the booking creation.
 */

import type { PrismaClient } from "@/app/generated/prisma/client";

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export async function assignWritingQuestion(
    studentUserId: string,
    tx: Tx,
): Promise<string | null> {
    const activeQuestions = await tx.writingQuestion.findMany({
        where: { isActive: true },
        select: { id: true },
    });

    if (activeQuestions.length === 0) return null;

    // All question IDs assigned to this student across non-cancelled bookings
    const previousBookings = await tx.booking.findMany({
        where: {
            userId: studentUserId,
            status: { not: "CANCELLED" },
            writingQuestionId: { not: null },
        },
        select: { writingQuestionId: true },
    });

    const usedIds = previousBookings.map((b) => b.writingQuestionId as string);
    const usedSet = new Set(usedIds);

    const activeIds = activeQuestions.map((q) => q.id);
    const unseenIds = activeIds.filter((id) => !usedSet.has(id));

    if (unseenIds.length > 0) {
        // Pick randomly from unseen questions
        return unseenIds[Math.floor(Math.random() * unseenIds.length)]!;
    }

    // All questions seen — pick the one used the fewest times by this student
    const countMap = new Map<string, number>();
    for (const id of usedIds) {
        countMap.set(id, (countMap.get(id) ?? 0) + 1);
    }

    return activeIds.sort(
        (a, b) => (countMap.get(a) ?? 0) - (countMap.get(b) ?? 0),
    )[0]!;
}
