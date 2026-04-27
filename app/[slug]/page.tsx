import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import { prisma } from "@/lib/prisma";
import { LandingHeader } from "@/components/landing-header";

const dark = "#0B0B0F";

function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const page = await prisma.staticPage.findFirst({
        where: { slug, isActive: true },
        select: { title: true, content: true, slug: true },
    });
    if (!page) {
        return { title: "Page" };
    }
    const description = page.content.slice(0, 160).replace(/\n/g, " ");
    return {
        title: page.title,
        description,
        alternates: { canonical: `/${page.slug}` },
        openGraph: {
            title: page.title,
            description,
            url: `/${page.slug}`,
        },
    };
}

export default async function PublicStaticPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const page = await prisma.staticPage.findFirst({
        where: { slug, isActive: true },
    });

    if (!page) notFound();
    const safeContent = sanitizeHtml(page.content, {
        allowedTags: [
            "p",
            "br",
            "strong",
            "em",
            "u",
            "s",
            "h2",
            "h3",
            "ul",
            "ol",
            "li",
            "a",
            "blockquote",
        ],
        allowedAttributes: {
            a: ["href", "target", "rel"],
        },
        allowedSchemes: ["http", "https", "mailto"],
        transformTags: {
            a: sanitizeHtml.simpleTransform("a", {
                rel: "noopener noreferrer",
                target: "_blank",
            }),
        },
    });

    return (
        <div className="flex min-h-svh flex-col bg-[#F7F7F7]">
            <section
                className="relative pb-10 pt-28 sm:pt-32"
                style={{ backgroundColor: dark }}
            >
                <LandingHeader />
            </section>

            <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
                <Link
                    href="/"
                    className="text-sm font-medium text-[#7C5CFF] hover:underline"
                >
                    Back to home
                </Link>

                <article>
                    <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[#111]">
                        {page.title}
                    </h1>

                    <p className="mt-3 text-sm text-[#666]">
                        Created{" "}
                        <time dateTime={page.createdAt.toISOString()}>
                            {formatDate(page.createdAt)}
                        </time>{" "}
                        · Modified{" "}
                        <time dateTime={page.updatedAt.toISOString()}>
                            {formatDate(page.updatedAt)}
                        </time>
                    </p>

                    <div
                        className="prose prose-neutral mt-8 max-w-none text-[0.9375rem] leading-relaxed text-[#3d3d4a]"
                        dangerouslySetInnerHTML={{ __html: safeContent }}
                    />
                </article>
            </main>
        </div>
    );
}
