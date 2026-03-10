"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";
import { canAccess, type Role } from "@/lib/permissions";
import { createUserSchema, firstError } from "@/lib/validations";

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
    await prisma.user.create({
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

    revalidatePath("/users");
    redirect("/users");
}
