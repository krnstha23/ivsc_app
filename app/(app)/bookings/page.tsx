import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canAccess, type Role } from "@/lib/permissions";
import { BookingsTabs, type BookingItem } from "@/components/bookings-tabs";

export default async function BookingsPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>;
}) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const user = session.user as { id?: string; role?: string };
    if (!canAccess(user.role as Role, ["USER"])) redirect("/dashboard");

    const now = new Date();
    const userId = user.id!;

    const bookingSelect = {
        id: true,
        scheduledAt: true,
        duration: true,
        status: true,
        notes: true,
        meetLink: true,
        package: { select: { name: true } },
    } as const;

    const [upcoming, past, cancelled] = await Promise.all([
        prisma.booking.findMany({
            where: {
                userId,
                status: { in: ["PENDING", "CONFIRMED"] },
                scheduledAt: { gte: now },
            },
            select: bookingSelect,
            orderBy: { scheduledAt: "asc" },
        }),
        prisma.booking.findMany({
            where: {
                userId,
                OR: [
                    { status: "COMPLETED" },
                    {
                        status: { in: ["CONFIRMED", "PENDING"] },
                        scheduledAt: { lt: now },
                    },
                ],
            },
            select: bookingSelect,
            orderBy: { scheduledAt: "desc" },
        }),
        prisma.booking.findMany({
            where: { userId, status: "CANCELLED" },
            select: bookingSelect,
            orderBy: { scheduledAt: "desc" },
        }),
    ]);

    function serialize(
        bookings: (typeof upcoming)[number][]
    ): BookingItem[] {
        return bookings.map((b) => ({
            id: b.id,
            scheduledAt: b.scheduledAt.toISOString(),
            duration: b.duration,
            status: b.status,
            notes: b.notes,
            meetLink: b.meetLink,
            packageName: b.package?.name ?? null,
        }));
    }

    const { tab } = await searchParams;

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">My Bookings</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    View and manage your scheduled sessions.
                </p>
            </div>
            <div className="px-4 lg:px-6">
                <BookingsTabs
                    upcoming={serialize(upcoming)}
                    past={serialize(past)}
                    cancelled={serialize(cancelled)}
                    activeTab={tab || "upcoming"}
                />
            </div>
        </div>
    );
}
