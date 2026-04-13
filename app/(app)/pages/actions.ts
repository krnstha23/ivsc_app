"use server";

import { redirect } from "next/navigation";
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

export async function createStaticPage(formData: FormData) {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role as Role | undefined;
    if (!canAccess(role, ["ADMIN"])) {
        redirect("/dashboard");
    }

    const raw = {
        title: (formData.get("title") as string)?.trim(),
        content: (formData.get("content") as string)?.trim() ?? "",
        isActive: formData.get("isActive") === "on",
    };

    const parsed = createStaticPageSchema.safeParse(raw);
    if (!parsed.success) {
        redirect("/pages/new?error=" + encodeURIComponent(firstError(parsed.error)));
    }

    const data = parsed.data;
    const slug = slugify(data.title);

    const existing = await prisma.staticPage.findUnique({
        where: { slug },
        select: { id: true },
    });
    if (existing) {
        redirect(
            "/pages/new?error=" +
                encodeURIComponent("A page with this title already exists."),
        );
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
    redirect("/pages");
}

export async function updateStaticPage(formData: FormData) {
    const session = await auth();
    const adminRole = (session?.user as { role?: string } | undefined)
        ?.role as Role | undefined;
    if (!canAccess(adminRole, ["ADMIN"])) {
        redirect("/dashboard");
    }

    const raw = {
        id: formData.get("id") as string,
        title: (formData.get("title") as string)?.trim(),
        content: (formData.get("content") as string)?.trim() ?? "",
        isActive: formData.get("isActive") === "on",
    };

    const parsed = updateStaticPageSchema.safeParse(raw);
    if (!parsed.success) {
        const id = typeof raw.id === "string" ? raw.id : "";
        redirect(
            "/pages/" +
                id +
                "/edit?error=" +
                encodeURIComponent(firstError(parsed.error)),
        );
    }

    const data = parsed.data;
    const slug = slugify(data.title);

    const slugTaken = await prisma.staticPage.findFirst({
        where: { slug, NOT: { id: data.id } },
        select: { id: true },
    });
    if (slugTaken) {
        redirect(
            "/pages/" +
                data.id +
                "/edit?error=" +
                encodeURIComponent("A page with this title already exists."),
        );
    }

    const target = await prisma.staticPage.findUnique({
        where: { id: data.id },
        select: { id: true },
    });
    if (!target) {
        redirect("/pages?error=page_not_found");
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
    redirect("/pages");
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
