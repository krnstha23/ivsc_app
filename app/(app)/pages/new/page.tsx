import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccess, type Role } from "@/lib/permissions";
import { StaticPageForm } from "@/components/static-page-form";
import { createStaticPage } from "../actions";

export default async function NewStaticPagePage() {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const role = (session.user as { role?: string }).role as Role | undefined;
    if (!canAccess(role, ["ADMIN"])) redirect("/dashboard");

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">New Static Page</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Add a new page that visitors can open by URL.
                </p>
            </div>
            <div className="px-4 lg:px-6">
                <Suspense fallback={null}>
                    <StaticPageForm formAction={createStaticPage} />
                </Suspense>
            </div>
        </div>
    );
}
