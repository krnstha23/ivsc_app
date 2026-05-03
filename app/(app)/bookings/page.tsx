import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canAccess, type Role } from "@/lib/permissions";
import { BookingsTabs, type BookingItem } from "@/components/bookings-tabs";
import {
    BookingSessionSection,
    BookingSessionsSections,
    type SessionBookingRow,
} from "@/components/bookings-sessions-section";
import { AdminPendingBookings } from "@/components/admin-pending-bookings";
import type { PendingBookingRow } from "@/components/admin-pending-bookings";
import { cn } from "@/lib/utils";

function fullName(
    user: { firstName: string | null; lastName: string | null } | null,
) {
    if (!user) return null;
    const first = user.firstName?.trim() ?? "";
    const last = user.lastName?.trim() ?? "";
    return `${first} ${last}`.trim() || null;
}

const adminBookingSelect = {
    id: true,
    scheduledAt: true,
    duration: true,
    status: true,
    user: {
        select: { firstName: true, lastName: true },
    },
    teacher: {
        select: {
            user: {
                select: { firstName: true, lastName: true },
            },
        },
    },
} as const;

const pendingSelect = {
    id: true,
    scheduledAt: true,
    duration: true,
    bundleId: true,
    packageId: true,
    user: {
        select: { firstName: true, lastName: true },
    },
    teacher: {
        select: {
            user: {
                select: { firstName: true, lastName: true },
            },
        },
    },
    package: { select: { name: true } },
} as const;

export default async function BookingsPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>;
}) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const user = session.user as { id?: string; role?: string };
    const role = user.role as Role;
    if (!canAccess(role, ["USER", "TEACHER", "ADMIN"])) {
        redirect("/dashboard");
    }

    const { tab: tabParam } = await searchParams;
    const now = new Date();
    const userId = user.id!;

    if (role === "USER") {
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
                    status: "CONFIRMED",
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
                            status: "CONFIRMED",
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
            bookings: (typeof upcoming)[number][],
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
                        activeTab={tabParam || "upcoming"}
                    />
                </div>
            </div>
        );
    }

    if (role === "TEACHER") {
        const teacherProfile = await prisma.teacherProfile.findUnique({
            where: { userId },
            select: { id: true },
        });
        if (!teacherProfile) redirect("/dashboard");

        const bookingSelect = {
            id: true,
            scheduledAt: true,
            duration: true,
            status: true,
        } as const;

        const [upcomingRaw, pastRaw] = await Promise.all([
            prisma.booking.findMany({
                where: {
                    teacherId: teacherProfile.id,
                    status: "CONFIRMED",
                    scheduledAt: { gte: now },
                },
                select: bookingSelect,
                orderBy: { scheduledAt: "asc" },
            }),
            prisma.booking.findMany({
                where: {
                    teacherId: teacherProfile.id,
                    OR: [
                        { status: "COMPLETED" },
                        {
                            status: "CONFIRMED",
                            scheduledAt: { lt: now },
                        },
                    ],
                },
                select: bookingSelect,
                orderBy: { scheduledAt: "desc" },
            }),
        ]);

        const mapRow = (
            b: (typeof upcomingRaw)[number],
        ): SessionBookingRow => ({
            id: b.id,
            scheduledAt: b.scheduledAt,
            duration: b.duration,
            status: b.status,
            studentName: null,
            teacherName: null,
        });

        return (
            <div className="flex flex-col gap-6 py-4 md:gap-8 md:py-6">
                <div className="px-4 lg:px-6">
                    <h1 className="text-xl font-semibold">My Sessions</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        View and manage your teaching sessions.
                    </p>
                </div>
                <div className="px-4 lg:px-6">
                    <BookingSessionsSections
                        upcoming={upcomingRaw.map(mapRow)}
                        past={pastRaw.map(mapRow)}
                        showComplete
                        showNames={false}
                    />
                </div>
            </div>
        );
    }

    // ADMIN
    const [upcomingRaw, pastRaw, pendingRaw] = await Promise.all([
        prisma.booking.findMany({
            where: {
                status: "CONFIRMED",
                scheduledAt: { gte: now },
            },
            select: adminBookingSelect,
            orderBy: { scheduledAt: "asc" },
        }),
        prisma.booking.findMany({
            where: {
                OR: [
                    { status: "COMPLETED" },
                    {
                        status: "CONFIRMED",
                        scheduledAt: { lt: now },
                    },
                ],
            },
            select: adminBookingSelect,
            orderBy: { scheduledAt: "desc" },
        }),
        prisma.booking.findMany({
            where: { status: "PENDING" },
            select: pendingSelect,
            orderBy: { scheduledAt: "asc" },
        }),
    ]);

    const bundleIds = [
        ...new Set(
            pendingRaw.map((b) => b.bundleId).filter((id): id is string => id != null),
        ),
    ];
    const bundles =
        bundleIds.length > 0
            ? await prisma.packageBundle.findMany({
                  where: { id: { in: bundleIds } },
                  select: { id: true, name: true },
              })
            : [];
    const bundleNameById = new Map(bundles.map((x) => [x.id, x.name]));

    const upcoming: SessionBookingRow[] = upcomingRaw.map((b) => ({
        id: b.id,
        scheduledAt: b.scheduledAt,
        duration: b.duration,
        status: b.status,
        studentName: fullName(b.user),
        teacherName: fullName(b.teacher?.user ?? null),
    }));

    const past: SessionBookingRow[] = pastRaw.map((b) => ({
        id: b.id,
        scheduledAt: b.scheduledAt,
        duration: b.duration,
        status: b.status,
        studentName: fullName(b.user),
        teacherName: fullName(b.teacher?.user ?? null),
    }));

    const adminTab =
        tabParam === "past" || tabParam === "pending" ? tabParam : "upcoming";

    const pending: PendingBookingRow[] = pendingRaw.map((b) => {
        const pkgName = b.package?.name ?? null;
        const bundleLabel = b.bundleId
            ? bundleNameById.get(b.bundleId) ?? "Bundle"
            : null;
        const bundleOrPackageLabel =
            [bundleLabel, pkgName].filter(Boolean).join(" · ") ||
            "—";

        return {
            id: b.id,
            scheduledAt: b.scheduledAt.toISOString(),
            duration: b.duration,
            studentName: fullName(b.user) ?? "—",
            teacherName: fullName(b.teacher?.user ?? null) ?? "—",
            bundleOrPackageLabel,
        };
    });

    function TabLink({
        value,
        label,
        count,
    }: {
        value: string;
        label: string;
        count: number;
    }) {
        const active = adminTab === value;
        return (
            <Link
                href={`/bookings?tab=${value}`}
                className={cn(
                    "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors",
                    active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                )}
                scroll={false}
            >
                {label} ({count})
            </Link>
        );
    }

    return (
        <div className="flex flex-col gap-6 py-4 md:gap-8 md:py-6">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">Bookings</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    All sessions and pending student requests.
                </p>
            </div>
            <div className="px-4 lg:px-6">
                <div className="bg-muted text-muted-foreground inline-flex h-9 items-center justify-center rounded-lg p-1">
                    <TabLink
                        value="upcoming"
                        label="Upcoming"
                        count={upcoming.length}
                    />
                    <TabLink value="past" label="Past" count={past.length} />
                    <TabLink
                        value="pending"
                        label="Pending"
                        count={pending.length}
                    />
                </div>
                <div className="mt-6">
                    {adminTab === "upcoming" && (
                        <BookingSessionSection
                            title="Upcoming"
                            bookings={upcoming}
                            emptyMessage="No upcoming sessions."
                            showComplete={false}
                            showNames
                        />
                    )}
                    {adminTab === "past" && (
                        <BookingSessionSection
                            title="Past"
                            bookings={past}
                            emptyMessage="No past sessions."
                            showComplete={false}
                            showNames
                        />
                    )}
                    {adminTab === "pending" && (
                        <>
                            <h2 className="mb-4 text-lg font-medium">
                                Pending approval
                            </h2>
                            <AdminPendingBookings bookings={pending} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
