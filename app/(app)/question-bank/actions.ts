"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccess, type Role } from "@/lib/permissions";

type ActionResult = { success: true } | { success: false; error: string };

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export async function uploadQuestion(
    formData: FormData,
): Promise<ActionResult> {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    const role = (session?.user as { role?: string })?.role as Role | undefined;
    if (!userId) return { success: false, error: "You must be signed in." };
    if (!canAccess(role, ["ADMIN", "TEACHER"])) {
        return { success: false, error: "Not authorized." };
    }

    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const file = formData.get("file") as File | null;

    const parsed = z
        .object({ title: z.string().min(1).max(200) })
        .safeParse({ title });
    if (!parsed.success) {
        return { success: false, error: "Title is required (max 200 characters)." };
    }

    if (!file) return { success: false, error: "No file provided." };
    if (file.type !== "application/pdf") {
        return { success: false, error: "Only PDF files are allowed." };
    }
    if (file.size > MAX_SIZE) {
        return { success: false, error: "File size must be under 20 MB." };
    }

    const dir = join(process.cwd(), "uploads", "questions");
    await mkdir(dir, { recursive: true });

    const safeFileName = `${crypto.randomUUID()}-${Date.now()}.pdf`;
    const filePath = join(dir, safeFileName);
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    await prisma.writingQuestion.create({
        data: {
            title: parsed.data.title,
            description: description?.trim() || null,
            filePath: `uploads/questions/${safeFileName}`,
            fileName: file.name,
            fileSize: file.size,
            uploadedBy: userId,
        },
    });

    revalidatePath("/question-bank");
    return { success: true };
}

export async function toggleQuestionActive(
    id: string,
): Promise<ActionResult> {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    const role = (session?.user as { role?: string })?.role as Role | undefined;
    if (!userId) return { success: false, error: "You must be signed in." };
    if (!canAccess(role, ["ADMIN", "TEACHER"])) {
        return { success: false, error: "Not authorized." };
    }

    const question = await prisma.writingQuestion.findUnique({
        where: { id },
        select: { id: true, isActive: true },
    });
    if (!question) return { success: false, error: "Question not found." };

    await prisma.writingQuestion.update({
        where: { id },
        data: { isActive: !question.isActive },
    });

    revalidatePath("/question-bank");
    return { success: true };
}

export async function deleteQuestion(id: string): Promise<ActionResult> {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    const role = (session?.user as { role?: string })?.role as Role | undefined;
    if (!userId) return { success: false, error: "You must be signed in." };
    if (!canAccess(role, ["ADMIN", "TEACHER"])) {
        return { success: false, error: "Not authorized." };
    }

    const question = await prisma.writingQuestion.findUnique({
        where: { id },
        select: {
            id: true,
            filePath: true,
            _count: { select: { bookings: true } },
        },
    });
    if (!question) return { success: false, error: "Question not found." };
    if (question._count.bookings > 0) {
        return {
            success: false,
            error: `Cannot delete — this question is assigned to ${question._count.bookings} booking(s).`,
        };
    }

    try {
        await unlink(join(process.cwd(), question.filePath));
    } catch {
        // file may already be gone
    }

    await prisma.writingQuestion.delete({ where: { id } });

    revalidatePath("/question-bank");
    return { success: true };
}
