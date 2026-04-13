import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const BASE = "https://scoremirror.test";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const pages = await prisma.staticPage.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
    });

    return [
        { url: BASE, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
        { url: `${BASE}/login`, changeFrequency: "monthly", priority: 0.3 },
        { url: `${BASE}/register`, changeFrequency: "monthly", priority: 0.3 },
        ...pages.map((p) => ({
            url: `${BASE}/${p.slug}`,
            lastModified: p.updatedAt,
            changeFrequency: "monthly" as const,
            priority: 0.5,
        })),
    ];
}
