import Link from "next/link";
import { CalendarMark, UserRounded } from "@solar-icons/react/ssr";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import type { StudentDashboardData } from "@/lib/dashboard-data";
import { formatSessionDate, formatSessionTime } from "./dashboard-datetime";

function Kpi({
    label,
    value,
    hint,
}: {
    label: string;
    value: number;
    hint: string;
}) {
    return (
        <Card className="@container/card shadow-xs">
            <CardHeader>
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                    {value}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">{hint}</p>
            </CardContent>
        </Card>
    );
}

const STATUS_CLASS: Record<string, string> = {
    PENDING: "text-amber-600 dark:text-amber-500",
    CONFIRMED: "text-emerald-600 dark:text-emerald-500",
    COMPLETED: "text-blue-600 dark:text-blue-500",
    CANCELLED: "text-red-600 dark:text-red-500",
};

function StatusLabel({ status }: { status: string }) {
    return (
        <span
            className={`text-xs font-medium uppercase ${STATUS_CLASS[status] ?? ""}`}
        >
            {status}
        </span>
    );
}

export function StudentDashboard({ data }: { data: StudentDashboardData }) {
    const { firstName, upcomingCount, completedCount, upcoming, next } = data;
    const upcomingList =
        next && upcoming.length > 0
            ? upcoming.filter((b) => b.id !== next.id)
            : upcoming;

    return (
        <div className="flex flex-col gap-6 py-2 md:gap-8">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">Welcome, {firstName}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Your next steps and session overview.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-3 dark:*:data-[slot=card]:bg-card lg:px-6">
                <Kpi
                    label="Upcoming sessions"
                    value={upcomingCount}
                    hint="Confirmed sessions from today onward"
                />
                <Kpi
                    label="Completed"
                    value={completedCount}
                    hint="All-time finished sessions"
                />
                <Card className="flex flex-col justify-between border-dashed bg-muted/20 shadow-xs">
                    <CardHeader>
                        <CardDescription>Quick actions</CardDescription>
                        <CardTitle className="text-base">Book &amp; manage</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2 pb-4">
                        <Button asChild size="sm" variant="default">
                            <Link href="/students">Book a session</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                            <Link href="/bookings">My bookings</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 px-4 lg:grid-cols-2 lg:px-6">
                {next && (
                    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card shadow-sm">
                        <CardHeader>
                            <CardDescription className="flex items-center gap-2">
                                <CalendarMark size={16} className="opacity-80" />
                                Next up
                            </CardDescription>
                            <CardTitle className="text-lg">
                                {formatSessionDate(next.scheduledAt)} ·{" "}
                                {formatSessionTime(next.scheduledAt)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            {next.teacherName && (
                                <p>
                                    <span className="text-muted-foreground">
                                        Examiner:{" "}
                                    </span>
                                    {next.teacherName}
                                </p>
                            )}
                            {next.packageName && (
                                <p>
                                    <span className="text-muted-foreground">
                                        Package:{" "}
                                    </span>
                                    {next.packageName}
                                </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                                <StatusLabel status={next.status} />
                                <span className="text-muted-foreground">
                                    · {next.duration} min
                                </span>
                            </div>
                            <Button asChild>
                                <Link href={`/sessions/${next.id}/room`}>
                                    Open session room
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <Card className="shadow-xs">
                    <CardHeader>
                        <CardDescription>Upcoming</CardDescription>
                        <CardTitle className="text-lg">Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {upcomingList.length === 0 && !next ? (
                            <p className="text-sm text-muted-foreground">
                                No upcoming sessions.{" "}
                                <Link
                                    href="/students"
                                    className="font-medium text-primary underline-offset-4 hover:underline"
                                >
                                    Book one
                                </Link>
                            </p>
                        ) : upcomingList.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No other upcoming sessions.
                            </p>
                        ) : (
                            <ul className="space-y-4">
                                {upcomingList.map((b) => (
                                    <li
                                        key={b.id}
                                        className="flex flex-col gap-1 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-medium">
                                                {formatSessionDate(
                                                    b.scheduledAt,
                                                )}
                                            </p>
                                            <StatusLabel status={b.status} />
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {formatSessionTime(b.scheduledAt)} ·{" "}
                                            {b.duration} min
                                        </p>
                                        <div className="pt-1">
                                            <Button asChild size="sm" variant="link" className="h-auto p-0">
                                                <Link href={`/sessions/${b.id}/room`}>
                                                    Session room →
                                                </Link>
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="px-4 pb-2 lg:px-6">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/profile" className="gap-2 text-muted-foreground">
                        <UserRounded size={16} />
                        Profile settings
                    </Link>
                </Button>
            </div>
        </div>
    );
}
