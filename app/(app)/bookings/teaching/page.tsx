import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { canAccess, type Role } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function studentName(user: {
    firstName: string;
    middleName: string | null;
    lastName: string;
}) {
    return [user.firstName, user.middleName, user.lastName]
        .filter(Boolean)
        .join(" ");
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
    user: {
        select: {
            firstName: true,
            middleName: true,
            lastName: true,
        },
    },
    package: { select: { name: true } },
} as const;

type BookingRow = Awaited<
    ReturnType<typeof prisma.booking.findMany<{ select: typeof bookingSelect }>>
>[number];

export default async function TeachingBookingsPage() {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const user = session.user as { id?: string; role?: string };
    if (!canAccess(user.role as Role, ["TEACHER"])) redirect("/dashboard");

    const teacherProfile = await prisma.teacherProfile.findUnique({
        where: { userId: user.id! },
        select: { id: true },
    });
    if (!teacherProfile) redirect("/dashboard");

    const now = new Date();

    const [upcoming, past] = await Promise.all([
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
                    { status: "CONFIRMED", scheduledAt: { lt: now } },
                ],
            },
            select: bookingSelect,
            orderBy: { scheduledAt: "desc" },
        }),
    ]);

    return (
        <div className="flex flex-col gap-6 py-4 md:gap-8 md:py-6">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">My Sessions</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    View and manage your teaching sessions.
                </p>
            </div>

            <Section
                title="Upcoming"
                bookings={upcoming}
                emptyMessage="No upcoming sessions."
                showComplete
            />
            <Section
                title="Past"
                bookings={past}
                emptyMessage="No past sessions."
            />
        </div>
    );
}

function Section({
    title,
    bookings,
    emptyMessage,
    showComplete,
}: {
    title: string;
    bookings: BookingRow[];
    emptyMessage: string;
    showComplete?: boolean;
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
                                    <TableHead>Student</TableHead>
                                    <TableHead>Date &amp; Time</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Package</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bookings.map((b) => (
                                    <TableRow key={b.id}>
                                        <TableCell className="font-medium">
                                            {studentName(b.user)}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(b.scheduledAt)}
                                            <br />
                                            <span className="text-muted-foreground">
                                                {formatTime(b.scheduledAt)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {b.duration} min
                                        </TableCell>
                                        <TableCell>
                                            {b.package?.name ?? "—"}
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
                                        <span className="font-medium">
                                            {studentName(b.user)}
                                        </span>
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
                                    <div className="flex items-center justify-between text-sm">
                                        <span>{b.duration} min</span>
                                        {b.package?.name && (
                                            <span>{b.package.name}</span>
                                        )}
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
                Complete
            </Button>
        </form>
    );
}
