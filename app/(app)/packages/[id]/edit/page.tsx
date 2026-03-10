import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { CreatePackageForm } from "@/components/create-package-form";

export default async function EditPackagePage({
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
    const pkg = await prisma.package.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            description: true,
            price: true,
            isActive: true,
        },
    });
    if (!pkg) redirect("/packages");

    const { error } = await searchParams;

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">Edit package</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Update package details.
                </p>
                {error && (
                    <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                    </p>
                )}
            </div>
            <div className="px-4 lg:px-6">
                <CreatePackageForm
                    mode="edit"
                    initial={{
                        id: pkg.id,
                        name: pkg.name,
                        description: pkg.description,
                        price: Number(pkg.price),
                        isActive: pkg.isActive,
                    }}
                />
            </div>
        </div>
    );
}

