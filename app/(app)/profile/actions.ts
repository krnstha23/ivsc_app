"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/app/generated/prisma/enums";
import { updateOwnProfileSchema, firstError } from "@/lib/validations";

export type UpdateProfileResult =
    | { success: true }
    | { success: false; error: string };

export async function updateOwnProfile(
    payload: Record<string, unknown>
): Promise<UpdateProfileResult> {
    const session = await auth();
    if (!session?.user) {
        return { success: false, error: "You must be signed in." };
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
        return { success: false, error: "You must be signed in." };
    }

    const parsed = updateOwnProfileSchema.safeParse(payload);
    if (!parsed.success) {
        return { success: false, error: firstError(parsed.error) };
    }

    const { firstName, middleName, lastName, email, phone, bio } = parsed.data;

    const existingEmail = await prisma.user.findFirst({
        where: {
            email,
            NOT: { id: userId },
        },
        select: { id: true },
    });
    if (existingEmail) {
        return { success: false, error: "Another account already uses this email." };
    }

    const role = (session.user as { role?: string | undefined }).role;

    await prisma.user.update({
        where: { id: userId },
        data: {
            firstName,
            middleName: middleName?.trim() || null,
            lastName,
            email,
            phone: phone?.trim() || null,
        },
    });

    if (role === Role.TEACHER || role === Role.ADMIN) {
        const teacher = await prisma.teacherProfile.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (teacher) {
            await prisma.teacherProfile.update({
                where: { id: teacher.id },
                data: { bio: bio?.trim() || null },
            });
        }
    }

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/teachers");
    return { success: true };
}
