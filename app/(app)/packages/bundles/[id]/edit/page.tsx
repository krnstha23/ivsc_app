import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { CreateBundleForm } from "@/components/create-bundle-form";

export default async function EditBundlePage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
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

    const { id } = await params;

    const [bundle, packages] = await Promise.all([
        prisma.packageBundle.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                description: true,
                priceStandard: true,
                pricePriority: true,
                priceInstant: true,
                duration: true,
                hasEvaluation: true,
                discountPercent: true,
                isActive: true,
                isFeatured: true,
                packageIds: true,
            },
        }),
        prisma.package.findMany({
            select: { id: true, name: true, isActive: true },
            orderBy: [{ name: "asc" }],
        }),
    ]);

    if (!bundle) redirect("/packages");

    const { error } = await searchParams;

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">Edit bundle</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Update bundle details and included packages.
                </p>
                {error && (
                    <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                    </p>
                )}
            </div>
            <div className="px-4 lg:px-6">
                <CreateBundleForm
                    mode="edit"
                    packages={packages}
                    initial={{
                        id: bundle.id,
                        name: bundle.name,
                        description: bundle.description,
                        priceStandard: Number(bundle.priceStandard),
                        pricePriority: Number(bundle.pricePriority),
                        priceInstant: Number(bundle.priceInstant),
                        duration: bundle.duration,
                        hasEvaluation: bundle.hasEvaluation,
                        discountPercent:
                            bundle.discountPercent == null
                                ? null
                                : Number(bundle.discountPercent),
                        isActive: bundle.isActive,
                        isFeatured: bundle.isFeatured,
                        packageIds: bundle.packageIds,
                    }}
                />
            </div>
        </div>
    );
}

