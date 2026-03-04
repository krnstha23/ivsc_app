"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";

type Role = "ADMIN" | "TEACHER" | "USER";

export async function createUser(formData: FormData) {
    const userName = (formData.get("username") as string)?.trim();
    const email = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;
    const firstName = (formData.get("firstName") as string)?.trim();
    const middleName = (formData.get("middleName") as string)?.trim() || null;
    const lastName = (formData.get("lastName") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim() || null;
    const role = (formData.get("role") as Role) || "USER";
    const isActive = formData.get("isActive") === "on";

    if (!userName || !email || !password || !firstName || !lastName) {
        redirect("/users/new?error=missing");
    }

    const existing = await prisma.user.findFirst({
        where: {
            OR: [{ userName }, { email }],
        },
    });
    if (existing) {
        redirect(
            `/users/new?error=exists${existing.userName === userName ? "&field=username" : "&field=email"}`
        );
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.create({
        data: {
            userName,
            email,
            passwordHash,
            firstName,
            middleName,
            lastName,
            phone,
            role,
            isActive,
        },
    });

    revalidatePath("/users");
    redirect("/users");
}
