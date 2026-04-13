import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BundleCards } from "@/components/bundle-cards";

export default async function StudentsPage() {
    const session = await auth();
    if (!session?.user) {
        redirect("/login");
    }

    const bundles = await prisma.packageBundle.findMany({
        where: { isActive: true },
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
        orderBy: [{ name: "asc" }],
        take: 3,
    });

    const bundlesForClient = bundles.map((b) => ({
        ...b,
        priceStandard: Number(b.priceStandard),
        pricePriority: Number(b.pricePriority),
        priceInstant: Number(b.priceInstant),
        discountPercent:
            b.discountPercent == null ? null : Number(b.discountPercent),
    }));

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">Students</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Browse package bundles. Choose a bundle to view and book
                    packages.
                </p>
            </div>
            <div className="px-4 my-5 lg:px-6">
                <BundleCards bundles={bundlesForClient} />
            </div>
        </div>
    );
}
