import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ bookingId: string }> },
) {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await params;

    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
            userId: true,
            writingSubmission: {
                select: { filePath: true, fileName: true },
            },
            evaluation: {
                select: { submittedAt: true },
            },
        },
    });

    if (!booking || booking.userId !== userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!booking.writingSubmission || !booking.evaluation) {
        return NextResponse.json({ error: "Not available" }, { status: 400 });
    }

    const deadline =
        new Date(booking.evaluation.submittedAt).getTime() + 24 * 60 * 60 * 1000;
    if (Date.now() > deadline) {
        return NextResponse.json({ error: "Download window expired" }, { status: 403 });
    }

    const filePath = join(process.cwd(), booking.writingSubmission.filePath);

    try {
        const fileBuffer = await readFile(filePath);
        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${booking.writingSubmission.fileName}"`,
            },
        });
    } catch {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
}
