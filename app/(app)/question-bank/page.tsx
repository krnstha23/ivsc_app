import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canAccess, type Role } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { QuestionBankClient } from "./question-bank-client";

export default async function QuestionBankPage() {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role as Role | undefined;
    if (!canAccess(role, ["ADMIN", "TEACHER"])) redirect("/dashboard");

    let questions: {
        id: string;
        title: string;
        description: string | null;
        fileName: string;
        fileSize: number;
        isActive: boolean;
        createdAt: Date;
        uploader: { firstName: string; lastName: string; role: string };
        _count: { bookings: number };
    }[] = [];

    try {
        questions = await prisma.writingQuestion.findMany({
            orderBy: [{ title: "asc" }],
            select: {
                id: true,
                title: true,
                description: true,
                fileName: true,
                fileSize: true,
                isActive: true,
                createdAt: true,
                uploader: {
                    select: { firstName: true, lastName: true, role: true },
                },
                _count: { select: { bookings: true } },
            },
        });
    } catch {
        // writing_questions table may not exist yet — show empty state
    }

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">Question Bank</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Manage IELTS writing questions. Questions are auto-assigned to eligible
                    bookings, ensuring each student receives a fresh question.
                </p>
            </div>
            <div className="px-4 lg:px-6">
                <QuestionBankClient questions={questions} />
            </div>
        </div>
    );
}
