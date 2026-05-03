import Link from "next/link";
import { Eye } from "lucide-react";
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
import { CompleteBookingForm } from "@/app/(app)/bookings/complete-booking-form";

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

export type SessionBookingRow = {
    id: string;
    scheduledAt: Date;
    duration: number;
    status: string;
    studentName: string | null;
    teacherName: string | null;
};

export function BookingSessionSection({
    title,
    bookings,
    emptyMessage,
    showComplete,
    showNames = false,
}: {
    title: string;
    bookings: SessionBookingRow[];
    emptyMessage: string;
    showComplete?: boolean;
    showNames?: boolean;
}) {
    return (
        <section>
            <h2 className="mb-4 text-lg font-medium">{title}</h2>

            {bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            ) : (
                <>
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
                                    <TableHead className="text-right">Action</TableHead>
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
                                        <TableCell>{b.duration} min</TableCell>
                                        <TableCell>
                                            <Badge variant={statusVariant(b.status)}>
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
                                                    <Link href={`/sessions/${b.id}/room`}>
                                                        <Eye size={16} />
                                                    </Link>
                                                </Button>
                                                {showComplete && (
                                                    <CompleteBookingForm bookingId={b.id} />
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex flex-col gap-3 md:hidden">
                        {bookings.map((b) => (
                            <Card key={b.id}>
                                <CardContent className="flex flex-col gap-2 p-4">
                                    <div className="flex items-center justify-between">
                                        <Badge variant={statusVariant(b.status)}>
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
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/sessions/${b.id}/room`}>
                                                Enter Room
                                            </Link>
                                        </Button>
                                        {showComplete && <CompleteBookingForm bookingId={b.id} />}
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

export function BookingSessionsSections({
    upcoming,
    past,
    showComplete,
    showNames,
    upcomingTitle = "Upcoming",
    pastTitle = "Past",
    emptyUpcoming = "No upcoming sessions.",
    emptyPast = "No past sessions.",
}: {
    upcoming: SessionBookingRow[];
    past: SessionBookingRow[];
    showComplete: boolean;
    showNames: boolean;
    upcomingTitle?: string;
    pastTitle?: string;
    emptyUpcoming?: string;
    emptyPast?: string;
}) {
    return (
        <div className="flex flex-col gap-8">
            <BookingSessionSection
                title={upcomingTitle}
                bookings={upcoming}
                emptyMessage={emptyUpcoming}
                showComplete={showComplete}
                showNames={showNames}
            />
            <BookingSessionSection
                title={pastTitle}
                bookings={past}
                emptyMessage={emptyPast}
                showComplete={false}
                showNames={showNames}
            />
        </div>
    );
}
