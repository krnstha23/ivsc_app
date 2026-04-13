"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";
import { canAccess, type Role } from "@/lib/permissions";
import {
    createUserSchema,
    updateUserAdminSchema,
    firstError,
} from "@/lib/validations";
import { Role as PrismaRole } from "@/app/generated/prisma/enums";

export async function createUser(formData: FormData) {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role as Role | undefined;
    if (!canAccess(role, ["ADMIN"])) {
        redirect("/dashboard");
    }

    const raw = {
        username: (formData.get("username") as string)?.trim(),
        email: (formData.get("email") as string)?.trim(),
        password: formData.get("password") as string,
        firstName: (formData.get("firstName") as string)?.trim(),
        middleName: (formData.get("middleName") as string)?.trim() || null,
        lastName: (formData.get("lastName") as string)?.trim(),
        phone: (formData.get("phone") as string)?.trim() || null,
        role: (formData.get("role") as string) || "USER",
        isActive: formData.get("isActive") === "on",
    };

    const parsed = createUserSchema.safeParse(raw);
    if (!parsed.success) {
        redirect(`/users/new?error=${encodeURIComponent(firstError(parsed.error))}`);
    }

    const data = parsed.data;

    const existing = await prisma.user.findFirst({
        where: {
            OR: [{ userName: data.username }, { email: data.email }],
        },
    });
    if (existing) {
        redirect(
            `/users/new?error=exists${existing.userName === data.username ? "&field=username" : "&field=email"}`
        );
    }

    const passwordHash = await hashPassword(data.password);

    await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                userName: data.username,
                email: data.email,
                passwordHash,
                firstName: data.firstName,
                middleName: data.middleName,
                lastName: data.lastName,
                phone: data.phone,
                role: data.role,
                isActive: data.isActive,
            },
        });

        if (data.role === PrismaRole.USER) {
            await tx.studentProfile.create({ data: { userId: user.id } });
        } else if (data.role === PrismaRole.TEACHER) {
            await tx.teacherProfile.create({
                data: { userId: user.id, isApproved: true },
            });
        }
    });

    revalidatePath("/users");
    redirect("/users");
}

export async function approveTeacher(formData: FormData) {
    const session = await auth();
    const adminRole = (session?.user as { role?: string } | undefined)
        ?.role as Role | undefined;
    if (!canAccess(adminRole, ["ADMIN"])) {
        redirect("/dashboard");
    }

    const userId = formData.get("userId") as string;
    if (!userId) redirect("/users");

    await prisma.teacherProfile.updateMany({
        where: { userId },
        data: { isApproved: true },
    });

    revalidatePath("/users");
    redirect("/users");
}

export async function updateUser(formData: FormData) {
    const session = await auth();
    const adminRole = (session?.user as { role?: string } | undefined)
        ?.role as Role | undefined;
    if (!canAccess(adminRole, ["ADMIN"])) {
        redirect("/dashboard");
    }

    const newPasswordRaw = (formData.get("newPassword") as string)?.trim() ?? "";

    const raw = {
        id: formData.get("id") as string,
        firstName: (formData.get("firstName") as string)?.trim(),
        middleName: (formData.get("middleName") as string)?.trim() || null,
        lastName: (formData.get("lastName") as string)?.trim(),
        email: (formData.get("email") as string)?.trim(),
        phone: (formData.get("phone") as string)?.trim() || null,
        role: (formData.get("role") as string) || "USER",
        isActive: formData.get("isActive") === "on",
        newPassword: newPasswordRaw.length > 0 ? newPasswordRaw : "",
    };

    const parsed = updateUserAdminSchema.safeParse(raw);
    if (!parsed.success) {
        const id = typeof raw.id === "string" ? raw.id : "";
        redirect(
            `/users/${id}/edit?error=${encodeURIComponent(firstError(parsed.error))}`,
        );
    }

    const data = parsed.data;

    const target = await prisma.user.findUnique({
        where: { id: data.id },
        select: {
            id: true,
            userName: true,
            role: true,
            studentProfile: { select: { id: true } },
            teacherProfile: { select: { id: true } },
        },
    });
    if (!target) {
        redirect("/users?error=user_not_found");
    }

    const emailTaken = await prisma.user.findFirst({
        where: { email: data.email, NOT: { id: data.id } },
        select: { id: true },
    });
    if (emailTaken) {
        redirect(
            `/users/${data.id}/edit?error=${encodeURIComponent("Email is already in use.")}`,
        );
    }

    const passwordUpdate =
        data.newPassword && data.newPassword.length >= 8
            ? { passwordHash: await hashPassword(data.newPassword) }
            : {};

    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: data.id },
            data: {
                firstName: data.firstName,
                middleName: data.middleName,
                lastName: data.lastName,
                email: data.email,
                phone: data.phone,
                role: data.role,
                isActive: data.isActive,
                ...passwordUpdate,
            },
        });

        if (data.role === PrismaRole.USER && !target.studentProfile) {
            await tx.studentProfile.create({ data: { userId: data.id } });
        }
        if (data.role === PrismaRole.TEACHER && !target.teacherProfile) {
            await tx.teacherProfile.create({ data: { userId: data.id } });
        }
    });

    revalidatePath("/users");
    revalidatePath(`/users/${data.id}/edit`);
    redirect("/users");
}
