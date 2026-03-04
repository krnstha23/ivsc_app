"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";
import { Role } from "@/app/generated/prisma/client";

export type CreateAccountResult =
    | { success: true }
    | { success: false; error: string };

type RegisterPayload = {
    username: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    phone: string | null;
    email: string;
    userType: "student" | "teacher";
    password: string;
};

export async function createAccount(
    payload: RegisterPayload
): Promise<CreateAccountResult> {
    const {
        username: rawUsername,
        firstName,
        middleName,
        lastName,
        phone,
        email,
        userType,
        password,
    } = payload;

    const username = rawUsername.trim();
    const trimmedEmail = email.trim();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!username || !trimmedEmail || !trimmedFirst || !trimmedLast || !password) {
        return { success: false, error: "Required fields are missing." };
    }

    if (password.length < 8) {
        return { success: false, error: "Password must be at least 8 characters." };
    }

    const existing = await prisma.user.findFirst({
        where: {
            OR: [{ email: trimmedEmail }, { userName: username }],
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

    const now = new Date();

    await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                userName: username,
                email: trimmedEmail,
                phone: phone?.trim() || null,
                firstName: trimmedFirst,
                middleName: middleName?.trim() || null,
                lastName: trimmedLast,
                passwordHash,
                role,
                isActive: true,
                createdAt: now,
                updatedAt: now,
            },
        });

        if (userType === "student") {
            await tx.studentProfile.create({
                data: {
                    userId: user.id,
                    createdAt: now,
                    updatedAt: now,
                },
            });
        } else {
            await tx.teacherProfile.create({
                data: {
                    userId: user.id,
                    createdAt: now,
                    updatedAt: now,
                },
            });
        }
    });

    redirect("/login?registered=1");
}
