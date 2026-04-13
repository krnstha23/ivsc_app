import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { canAccess, type Role } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { StaticPageForm } from "@/components/static-page-form";
import { updateStaticPage } from "../../actions";

export default async function EditStaticPagePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const role = (session.user as { role?: string }).role as Role | undefined;
    if (!canAccess(role, ["ADMIN"])) redirect("/dashboard");

    const { id } = await params;

    const page = await prisma.staticPage.findUnique({
        where: { id },
    });

    if (!page) notFound();

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">Edit Static Page</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Update the title, URL slug, content, and visibility.
                </p>
            </div>
            <div className="px-4 lg:px-6">
                <Suspense fallback={null}>
                    <StaticPageForm
                        formAction={updateStaticPage}
                        initial={{
                            id: page.id,
                            title: page.title,
                            slug: page.slug,
                            content: page.content,
                            isActive: page.isActive,
                        }}
                    />
                </Suspense>
            </div>
        </div>
    );
}
