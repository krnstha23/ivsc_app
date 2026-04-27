import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/app/generated/prisma/enums";
import { SessionRoom } from "@/components/session-room";
import { createMeetSpace } from "@/lib/google-meet";

export default async function SessionRoomPage({
    params,
}: {
    params: Promise<{ bookingId: string }>;
}) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const userId = (session.user as { id?: string }).id;
    const role = (session.user as { role?: string }).role;
    if (!userId) redirect("/login");

    const { bookingId } = await params;

    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
            id: true,
            userId: true,
            bundleId: true,
            scheduledAt: true,
            duration: true,
            meetLink: true,
            submissionStart: true,
            submissionEnd: true,
            user: {
                select: { firstName: true, middleName: true, lastName: true },
            },
            teacher: {
                select: {
                    userId: true,
                    user: {
                        select: { firstName: true, middleName: true, lastName: true },
                    },
                },
            },
            evaluation: {
                select: { score: true, feedback: true, submittedAt: true },
            },
            writingSubmission: {
                select: {
                    fileName: true,
                    fileSize: true,
                    filePath: true,
                    uploadedAt: true,
                },
            },
        },
    });

    if (!booking) notFound();

    // Fetch writing question separately so a missing migration never crashes the page.
    let writingQuestion: { id: string; title: string; description: string | null; fileName: string } | null = null;
    try {
        const bq = await prisma.booking.findUnique({
            where: { id: bookingId },
            select: { writingQuestionId: true },
        });
        if (bq?.writingQuestionId) {
            writingQuestion = await prisma.writingQuestion.findUnique({
                where: { id: bq.writingQuestionId },
                select: { id: true, title: true, description: true, fileName: true },
            });
        }
    } catch {
        // writing_questions table may not exist yet — gracefully degrade
    }

    const teacherUserId = booking.teacher.userId;

    const isStudent = booking.userId === userId;
    const isTeacher = teacherUserId === userId;
    const isAdmin = role === Role.ADMIN;

    if (!isStudent && !isTeacher && !isAdmin) notFound();

    let viewRole: "student" | "teacher" | "admin";
    if (isAdmin && !isStudent && !isTeacher) {
        viewRole = "admin";
    } else if (isTeacher) {
        viewRole = "teacher";
    } else {
        viewRole = "student";
    }

    let bundle: { hasEvaluation: boolean; name: string; duration: number } | null = null;
    if (booking.bundleId) {
        bundle = await prisma.packageBundle.findUnique({
            where: { id: booking.bundleId },
            select: { hasEvaluation: true, name: true, duration: true },
        });
    }

    // Auto-generate Meet link on first load for speaking sessions.
    // Writing-only bundles (duration === 0) never need a Meet link.
    if (!booking.meetLink && bundle && bundle.duration > 0) {
        try {
            const { meetingUri } = await createMeetSpace();
            await prisma.booking.update({
                where: { id: booking.id },
                data: { meetLink: meetingUri },
            });
            booking.meetLink = meetingUri;
        } catch (err) {
            // Non-fatal: page still renders; MeetLinkStep shows an error notice.
            console.error("[SessionRoom] Failed to auto-generate Meet link:", err);
        }
    }

    const hasEvaluation = bundle?.hasEvaluation ?? false;
    const isWritingOnly = bundle?.duration === 0;
    const sessionStarted = new Date() >= new Date(booking.scheduledAt);

    const stepLabels: string[] = [];
    if (!isWritingOnly) {
        stepLabels.push("Speaking Session");
    }
    stepLabels.push("Writing");
    if (hasEvaluation) {
        stepLabels.push("Evaluation");
        stepLabels.push("Results");
    }

    let currentStep = 1;
    if (!isWritingOnly && booking.meetLink) {
        currentStep = stepLabels.indexOf("Writing") + 1;
    }
    if (booking.writingSubmission) {
        currentStep = hasEvaluation
            ? stepLabels.indexOf("Evaluation") + 1
            : stepLabels.length;
    }
    if (booking.evaluation) {
        currentStep = stepLabels.length;
    }

    const studentName = [
        booking.user.firstName,
        booking.user.middleName,
        booking.user.lastName,
    ]
        .filter(Boolean)
        .join(" ")
        .trim() || "Student";

    const teacherName = [
        booking.teacher.user.firstName,
        booking.teacher.user.middleName,
        booking.teacher.user.lastName,
    ]
        .filter(Boolean)
        .join(" ")
        .trim() || "Teacher";

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">Session Room</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {viewRole === "admin"
                        ? `Viewing session between ${studentName} and ${teacherName} (read-only).`
                        : "Your session room."}
                </p>
            </div>
            <div className="px-4 lg:px-6">
                <SessionRoom
                    data={{
                        bookingId: booking.id,
                        scheduledAt: booking.scheduledAt.toISOString(),
                        duration: booking.duration,
                        bundleName: bundle?.name ?? null,
                        meetLink: booking.meetLink,
                        studentName,
                        teacherName,
                        writingSubmission: booking.writingSubmission
                            ? {
                                  fileName: (booking.writingSubmission as { fileName: string }).fileName,
                                  fileSize: (booking.writingSubmission as { fileSize: number }).fileSize,
                                  filePath: (booking.writingSubmission as { filePath: string }).filePath,
                                  uploadedAt: (booking.writingSubmission as { uploadedAt: Date }).uploadedAt.toISOString(),
                              }
                            : null,
                        evaluation: booking.evaluation
                            ? {
                                  score: (booking.evaluation as { score: number }).score,
                                  feedback: (booking.evaluation as { feedback: string }).feedback,
                                  submittedAt: (booking.evaluation as { submittedAt: Date }).submittedAt.toISOString(),
                              }
                            : null,
                        hasEvaluation,
                        currentStep,
                        totalSteps: stepLabels.length,
                        stepLabels,
                        role: viewRole,
                        submissionStart: booking.submissionStart?.toISOString() ?? null,
                        submissionEnd: booking.submissionEnd?.toISOString() ?? null,
                        writingQuestion: writingQuestion ?? null,
                        sessionStarted,
                    }}
                />
            </div>
        </div>
    );
}
