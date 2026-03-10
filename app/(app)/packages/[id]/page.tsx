import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    getEnrollmentForPackage,
} from "@/app/(app)/packages/actions";

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
    const enrollment = await getEnrollmentForPackage(packageId);

    return (
        <div className="flex flex-col gap-6 py-4 md:py-6">
            <div className="px-4 lg:px-6 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-xl font-semibold">{pkg.name}</h1>
                    {isAdmin && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/packages/${pkg.id}/edit`}>
                                Edit package
                            </Link>
                        </Button>
                    )}
                </div>
                {pkg.description && (
                    <p className="text-muted-foreground">{pkg.description}</p>
                )}
                <p className="text-lg font-medium">
                    $
                    {Number(pkg.price).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                    })}
                </p>
                {!pkg.isActive && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                        This package is currently inactive.
                    </p>
                )}
            </div>

            {enrollment && (
                <div className="px-4 lg:px-6">
                    <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                        <span className="font-medium">Your enrollment: </span>
                        <span className="text-muted-foreground">
                            {enrollment.classesRemaining} of{" "}
                            {enrollment.classesTotal} classes remaining.
                        </span>
                    </div>
                </div>
            )}

            {role === "USER" && (
                <div className="px-4 lg:px-6">
                    {enrollment && enrollment.classesRemaining > 0 ? (
                        <div className="flex flex-col gap-2">
                            <p className="text-sm text-muted-foreground">
                                You have {enrollment.classesRemaining} class
                                {enrollment.classesRemaining !== 1 ? "es" : ""}{" "}
                                remaining. Book a session below.
                            </p>
                            <Button asChild>
                                <Link href={`/packages/${pkg.id}/book`}>
                                    Book a session →
                                </Link>
                            </Button>
                        </div>
                    ) : enrollment ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
                            You have no classes left in this package. Contact
                            your administrator to purchase more.
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                            <span aria-hidden>📅</span>
                            <span>
                                You need to be enrolled in this package to book
                                sessions. Contact your administrator.
                            </span>
                        </div>
                    )}
                </div>
            )}

            <div className="px-4 lg:px-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/packages">← Back to packages</Link>
                </Button>
            </div>
        </div>
    );
}
