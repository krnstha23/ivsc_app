import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { CreateBundleForm } from "@/components/create-bundle-form";

export default async function NewBundlePage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>;
}) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const role = (session.user as { role?: string }).role as
        | "ADMIN"
        | "TEACHER"
        | "USER"
        | undefined;
    if (!canAccess(role, ["ADMIN"])) redirect("/packages");

    const packages = await prisma.package.findMany({
        select: { id: true, name: true, isActive: true },
        orderBy: [{ name: "asc" }],
    });

    const { error } = await searchParams;

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">Create bundle</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Group one or more packages into a bundle.
                </p>
                {error && (
                    <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                    </p>
                )}
            </div>
            <div className="px-4 lg:px-6">
                <CreateBundleForm packages={packages} />
            </div>
        </div>
    );
}

