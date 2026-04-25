"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccess, type Role } from "@/lib/permissions";
import {
    createStaticPageSchema,
    updateStaticPageSchema,
    firstError,
} from "@/lib/validations";

function slugify(title: string): string {
    return title
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

type ActionResult = { success: true } | { success: false; error: string };

export async function createStaticPage(formData: FormData): Promise<ActionResult> {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role as Role | undefined;
    if (!canAccess(role, ["ADMIN"])) {
        return { success: false, error: "Forbidden." };
    }

    const raw = {
        title: (formData.get("title") as string)?.trim(),
        content: (formData.get("content") as string)?.trim() ?? "",
        isActive: formData.get("isActive") === "on",
    };

    const parsed = createStaticPageSchema.safeParse(raw);
    if (!parsed.success) {
        return { success: false, error: firstError(parsed.error) };
    }

    const data = parsed.data;
    const slug = slugify(data.title);

    const existing = await prisma.staticPage.findUnique({
        where: { slug },
        select: { id: true },
    });
    if (existing) {
        return { success: false, error: "A page with this title already exists." };
    }

    await prisma.staticPage.create({
        data: {
            title: data.title,
            slug,
            content: data.content,
            isActive: data.isActive,
        },
    });

    revalidatePath("/pages");
    return { success: true };
}

export async function updateStaticPage(formData: FormData): Promise<ActionResult> {
    const session = await auth();
    const adminRole = (session?.user as { role?: string } | undefined)
        ?.role as Role | undefined;
    if (!canAccess(adminRole, ["ADMIN"])) {
        return { success: false, error: "Forbidden." };
    }

    const raw = {
        id: formData.get("id") as string,
        title: (formData.get("title") as string)?.trim(),
        content: (formData.get("content") as string)?.trim() ?? "",
        isActive: formData.get("isActive") === "on",
    };

    const parsed = updateStaticPageSchema.safeParse(raw);
    if (!parsed.success) {
        return { success: false, error: firstError(parsed.error) };
    }

    const data = parsed.data;
    const slug = slugify(data.title);

    const slugTaken = await prisma.staticPage.findFirst({
        where: { slug, NOT: { id: data.id } },
        select: { id: true },
    });
    if (slugTaken) {
        return { success: false, error: "A page with this title already exists." };
    }

    const target = await prisma.staticPage.findUnique({
        where: { id: data.id },
        select: { id: true },
    });
    if (!target) {
        return { success: false, error: "Page not found." };
    }

    await prisma.staticPage.update({
        where: { id: data.id },
        data: {
            title: data.title,
            slug,
            content: data.content,
            isActive: data.isActive,
        },
    });

    revalidatePath("/pages");
    return { success: true };
}

export async function deleteStaticPage(
    id: string,
): Promise<{ success: boolean; error?: string }> {
    const session = await auth();
    const adminRole = (session?.user as { role?: string } | undefined)
        ?.role as Role | undefined;
    if (!canAccess(adminRole, ["ADMIN"])) {
        return { success: false, error: "Forbidden" };
    }

    await prisma.staticPage.delete({ where: { id } });

    revalidatePath("/pages");
    return { success: true };
}

export async function toggleStaticPageActive(
    id: string,
): Promise<{ success: boolean; error?: string }> {
    const session = await auth();
    const adminRole = (session?.user as { role?: string } | undefined)
        ?.role as Role | undefined;
    if (!canAccess(adminRole, ["ADMIN"])) {
        return { success: false, error: "Forbidden" };
    }

    const page = await prisma.staticPage.findUnique({
        where: { id },
        select: { isActive: true },
    });
    if (!page) {
        return { success: false, error: "Not found" };
    }

    await prisma.staticPage.update({
        where: { id },
        data: { isActive: !page.isActive },
    });

    revalidatePath("/pages");
    return { success: true };
}
