import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatRs } from "@/lib/format-rs";

export default async function PackageDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const { id: packageId } = await params;
    const pkg = await prisma.package.findUnique({
        where: { id: packageId },
        select: {
            id: true,
            name: true,
            description: true,
            price: true,
            isActive: true,
        },
    });
    if (!pkg) notFound();

    const role = (session.user as { role?: string }).role as
        | "ADMIN"
        | "TEACHER"
        | "USER"
        | undefined;
    const isAdmin = canAccess(role, ["ADMIN"]);

    return (
        <div className="flex flex-col gap-6 py-4 md:py-6">
            <div className="flex flex-col gap-2 px-4 lg:px-6">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-xl font-semibold">{pkg.name}</h1>
                    <div className="flex gap-2">
                        {isAdmin && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href={`/packages/${pkg.id}/edit`}>
                                    Edit package
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
                {pkg.description && (
                    <p className="text-muted-foreground">{pkg.description}</p>
                )}
                <p className="text-lg font-medium">{formatRs(Number(pkg.price))}</p>
                {!pkg.isActive && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                        This package is currently inactive.
                    </p>
                )}
            </div>

            {role === "USER" && (
                <div className="px-4 lg:px-6">
                    <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                        <p className="font-medium">Book speaking sessions via bundles</p>
                        <p className="mt-1 text-muted-foreground">
                            Students schedule sessions from featured bundles on the Book a
                            Session page.
                        </p>
                        <Button className="mt-3" size="sm" asChild>
                            <Link href="/students">Go to Book a Session</Link>
                        </Button>
                    </div>
                </div>
            )}

            <div className="px-4 lg:px-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={isAdmin ? "/packages" : "/dashboard"}>
                        {isAdmin ? "← Back to packages" : "← Back to dashboard"}
                    </Link>
                </Button>
            </div>
        </div>
    );
}
