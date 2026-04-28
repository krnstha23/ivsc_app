import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { canAccess, type Role } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { completeBooking } from "../actions";

function formatDate(date: Date) {
    return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

function formatTime(date: Date) {
    return new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "UTC",
    }).format(date);
}


function statusVariant(status: string) {
    switch (status) {
        case "CONFIRMED":
            return "default" as const;
        case "COMPLETED":
            return "secondary" as const;
        case "CANCELLED":
            return "destructive" as const;
        default:
            return "outline" as const;
    }
}

const bookingSelect = {
    id: true,
    scheduledAt: true,
    duration: true,
    status: true,
} as const;

const adminBookingSelect = {
    ...bookingSelect,
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

type BookingRow = {
    id: string;
    scheduledAt: Date;
    duration: number;
    status: string;
    studentName: string | null;
    teacherName: string | null;
};

function fullName(
    user: { firstName: string | null; lastName: string | null } | null,
) {
    if (!user) return null;
    const first = user.firstName?.trim() ?? "";
    const last = user.lastName?.trim() ?? "";
    return `${first} ${last}`.trim() || null;
}

export default async function TeachingBookingsPage() {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const user = session.user as { id?: string; role?: string };
    const role = user.role as Role | undefined;
    if (!canAccess(role, ["TEACHER", "ADMIN"])) redirect("/dashboard");
    const isAdmin = role === "ADMIN";

    let teacherProfileId: string | null = null;
    if (!isAdmin) {
        const teacherProfile = await prisma.teacherProfile.findUnique({
            where: { userId: user.id! },
            select: { id: true },
        });
        if (!teacherProfile) redirect("/dashboard");
        teacherProfileId = teacherProfile.id;
    }

    const now = new Date();

    let upcoming: BookingRow[] = [];
    let past: BookingRow[] = [];

    if (isAdmin) {
        const [upcomingRaw, pastRaw] = await Promise.all([
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
                        { status: "CONFIRMED", scheduledAt: { lt: now } },
                    ],
                },
                select: adminBookingSelect,
                orderBy: { scheduledAt: "desc" },
            }),
        ]);

        upcoming = upcomingRaw.map((b) => ({
            id: b.id,
            scheduledAt: b.scheduledAt,
            duration: b.duration,
            status: b.status,
            studentName: fullName(b.user),
            teacherName: fullName(b.teacher?.user ?? null),
        }));
        past = pastRaw.map((b) => ({
            id: b.id,
            scheduledAt: b.scheduledAt,
            duration: b.duration,
            status: b.status,
            studentName: fullName(b.user),
            teacherName: fullName(b.teacher?.user ?? null),
        }));
    } else {
        const [upcomingRaw, pastRaw] = await Promise.all([
            prisma.booking.findMany({
                where: {
                    teacherId: teacherProfileId!,
                    status: "CONFIRMED",
                    scheduledAt: { gte: now },
                },
                select: bookingSelect,
                orderBy: { scheduledAt: "asc" },
            }),
            prisma.booking.findMany({
                where: {
                    teacherId: teacherProfileId!,
                    OR: [
                        { status: "COMPLETED" },
                        { status: "CONFIRMED", scheduledAt: { lt: now } },
                    ],
                },
                select: bookingSelect,
                orderBy: { scheduledAt: "desc" },
            }),
        ]);

        upcoming = upcomingRaw.map((b) => ({
            id: b.id,
            scheduledAt: b.scheduledAt,
            duration: b.duration,
            status: b.status,
            studentName: null,
            teacherName: null,
        }));
        past = pastRaw.map((b) => ({
            id: b.id,
            scheduledAt: b.scheduledAt,
            duration: b.duration,
            status: b.status,
            studentName: null,
            teacherName: null,
        }));
    }

    return (
        <div className="flex flex-col gap-6 py-4 md:gap-8 md:py-6">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">
                    {isAdmin ? "Sessions" : "My Sessions"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {isAdmin
                        ? "View all confirmed and completed sessions."
                        : "View and manage your teaching sessions."}
                </p>
            </div>

            <Section
                title="Upcoming"
                bookings={upcoming}
                emptyMessage="No upcoming sessions."
                showComplete={!isAdmin}
                showNames={isAdmin}
            />
            <Section
                title="Past"
                bookings={past}
                emptyMessage="No past sessions."
                showNames={isAdmin}
            />
        </div>
    );
}

function Section({
    title,
    bookings,
    emptyMessage,
    showComplete,
    showNames = false,
}: {
    title: string;
    bookings: BookingRow[];
    emptyMessage: string;
    showComplete?: boolean;
    showNames?: boolean;
}) {
    return (
        <section className="px-4 lg:px-6">
            <h2 className="mb-4 text-lg font-medium">{title}</h2>

            {bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            ) : (
                <>
                    {/* Desktop */}
                    <div className="hidden md:block">
                        <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date &amp; Time</TableHead>
                                        {showNames && (
                                            <>
                                                <TableHead>Student</TableHead>
                                                <TableHead>Teacher</TableHead>
                                            </>
                                        )}
                                        <TableHead>Duration</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">
                                            Action
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bookings.map((b) => (
                                        <TableRow key={b.id}>
                                            <TableCell>
                                                {formatDate(b.scheduledAt)}
                                                <br />
                                                <span className="text-muted-foreground">
                                                    {formatTime(b.scheduledAt)}
                                                </span>
                                            </TableCell>
                                            {showNames && (
                                                <>
                                                    <TableCell>
                                                        {b.studentName ?? "—"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {b.teacherName ?? "—"}
                                                    </TableCell>
                                                </>
                                            )}
                                            <TableCell>
                                                {b.duration} min
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={statusVariant(
                                                        b.status
                                                    )}
                                                >
                                                    {b.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        aria-label="Enter session room"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={`/sessions/${b.id}/room`}
                                                        >
                                                            <Eye size={16} />
                                                        </Link>
                                                    </Button>
                                                    {showComplete && (
                                                        <CompleteForm
                                                            bookingId={b.id}
                                                        />
                                                    )}
                                                </div>
                                            </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile */}
                    <div className="flex flex-col gap-3 md:hidden">
                        {bookings.map((b) => (
                            <Card key={b.id}>
                                <CardContent className="flex flex-col gap-2 p-4">
                                    <div className="flex items-center justify-between">
                                        <Badge
                                            variant={statusVariant(b.status)}
                                        >
                                            {b.status}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {formatDate(b.scheduledAt)} at{" "}
                                        {formatTime(b.scheduledAt)}
                                    </p>
                                    {showNames && (
                                        <p className="text-sm text-muted-foreground">
                                            Student: {b.studentName ?? "—"} · Teacher:{" "}
                                            {b.teacherName ?? "—"}
                                        </p>
                                    )}
                                    <div className="flex items-center justify-between text-sm">
                                        <span>{b.duration} min</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <Link
                                                href={`/sessions/${b.id}/room`}
                                            >
                                                Enter Room
                                            </Link>
                                        </Button>
                                        {showComplete && (
                                            <CompleteForm bookingId={b.id} />
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}

function CompleteForm({ bookingId }: { bookingId: string }) {
    const action = async () => {
        "use server";
        await completeBooking(bookingId);
    };

    return (
        <form action={action}>
            <Button type="submit" size="sm" variant="outline">
                <Check size={16} />
            </Button>
        </form>
    );
}
