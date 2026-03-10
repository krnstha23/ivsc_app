"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";
import { registerSchema, firstError, type RegisterInput } from "@/lib/validations";
import { Role } from "@/app/generated/prisma/client";

export type CreateAccountResult =
    | { success: true }
    | { success: false; error: string };

export async function createAccount(
    payload: RegisterInput
): Promise<CreateAccountResult> {
    const parsed = registerSchema.safeParse(payload);
    if (!parsed.success) {
        return { success: false, error: firstError(parsed.error) };
    }

    const { username, firstName, middleName, lastName, phone, email, userType, password } = parsed.data;

    const existing = await prisma.user.findFirst({
        where: {
            OR: [{ email }, { userName: username }],
        },
    });
    if (existing) {
        if (existing.userName === username) {
            return { success: false, error: "This username is already taken." };
        }
        return { success: false, error: "An account with this email already exists." };
    }

    const role: Role = userType === "teacher" ? Role.TEACHER : Role.USER;
    const passwordHash = await hashPassword(password);

    await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                userName: username,
                email,
                phone: phone?.trim() || null,
                firstName,
                middleName: middleName?.trim() || null,
                lastName,
                passwordHash,
                role,
                isActive: true,
            },
        });

        if (userType === "student") {
            await tx.studentProfile.create({ data: { userId: user.id } });
        } else {
            await tx.teacherProfile.create({ data: { userId: user.id } });
        }
    });

    redirect("/login?registered=1");
}
