import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/app/generated/prisma/enums";
import { SessionRoom } from "@/components/session-room";

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
        include: {
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

    const hasEvaluation = bundle?.hasEvaluation ?? false;
    const isWritingOnly = bundle?.duration === 0;

    const stepLabels: string[] = [];
    if (!isWritingOnly) {
        stepLabels.push("Google Meet");
    }
    stepLabels.push("Writing Submission");
    if (hasEvaluation) {
        stepLabels.push("Evaluation");
        stepLabels.push("Results");
    }

    let currentStep = 1;
    if (!isWritingOnly && booking.meetLink) {
        currentStep = stepLabels.indexOf("Writing Submission") + 1;
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
                        : `Session with ${viewRole === "student" ? teacherName : studentName}.`}
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
                                  fileName: booking.writingSubmission.fileName,
                                  fileSize: booking.writingSubmission.fileSize,
                                  filePath: booking.writingSubmission.filePath,
                                  uploadedAt: booking.writingSubmission.uploadedAt.toISOString(),
                              }
                            : null,
                        evaluation: booking.evaluation
                            ? {
                                  score: booking.evaluation.score,
                                  feedback: booking.evaluation.feedback,
                                  submittedAt: booking.evaluation.submittedAt.toISOString(),
                              }
                            : null,
                        hasEvaluation,
                        currentStep,
                        totalSteps: stepLabels.length,
                        stepLabels,
                        role: viewRole,
                        submissionStart: booking.submissionStart?.toISOString() ?? null,
                        submissionEnd: booking.submissionEnd?.toISOString() ?? null,
                    }}
                />
            </div>
        </div>
    );
}
