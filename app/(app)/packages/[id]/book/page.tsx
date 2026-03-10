import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
    getEnrollmentForPackage,
    getAvailableSlotsForPackage,
} from "@/app/(app)/packages/actions";
import { PackageBookingSection } from "@/components/package-booking-section";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function PackageBookPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const { id: packageId } = await params;
    const pkg = await prisma.package.findUnique({
        where: { id: packageId },
        select: { id: true, name: true },
    });
    if (!pkg) notFound();

    const role = (session.user as { role?: string }).role;
    if (role !== "USER") redirect(`/packages/${packageId}`);

    const enrollment = await getEnrollmentForPackage(packageId);
    if (!enrollment || enrollment.classesRemaining <= 0) {
        redirect(`/packages/${packageId}`);
    }

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 14);
    const initialSlots = await getAvailableSlotsForPackage(
        packageId,
        today,
        endDate
    );

    return (
        <div className="flex flex-col gap-6 py-4 md:py-6">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">Book: {pkg.name}</h1>
            </div>
            <div className="px-4 lg:px-6">
                <PackageBookingSection
                    packageId={pkg.id}
                    packageName={pkg.name}
                    initialSlots={initialSlots}
                    classesRemaining={enrollment.classesRemaining}
                />
            </div>
            <div className="px-4 lg:px-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/packages/${packageId}`}>← Back to package</Link>
                </Button>
            </div>
        </div>
    );
}
