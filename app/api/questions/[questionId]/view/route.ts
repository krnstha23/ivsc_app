import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

import { auth } from "@/lib/auth";
import { canAccess, type Role } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ questionId: string }> },
) {
    const { questionId } = await params;

    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    const role = (session?.user as { role?: string })?.role as Role | undefined;

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const question = await prisma.writingQuestion.findUnique({
        where: { id: questionId },
        select: { id: true, filePath: true, fileName: true },
    });
    if (!question) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (canAccess(role, ["ADMIN", "TEACHER"])) {
        // Admins and teachers always have access
    } else {
        // Students: ensure the question belongs to one of their active bookings
        // AND that the session has already started (scheduledAt <= now).
        const now = new Date();
        const eligibleBooking = await prisma.booking.findFirst({
            where: {
                userId,
                writingQuestionId: questionId,
                status: { not: "CANCELLED" },
                scheduledAt: { lte: now },
            },
            select: { id: true },
        });

        if (!eligibleBooking) {
            return NextResponse.json(
                { error: "Access denied or session has not started yet." },
                { status: 403 },
            );
        }
    }

    try {
        const filePath = join(process.cwd(), question.filePath);
        const buffer = await readFile(filePath);
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${encodeURIComponent(question.fileName)}"`,
                "Cache-Control": "private, no-store",
            },
        });
    } catch {
        return NextResponse.json(
            { error: "File not found on disk." },
            { status: 500 },
        );
    }
}
