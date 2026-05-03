import Link from "next/link";
import { CalendarMark, Notebook, UserCheck } from "@solar-icons/react/ssr";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import type { TeacherDashboardData } from "@/lib/dashboard-data";
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
        <Card className="shadow-xs">
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
    CONFIRMED: "text-emerald-600 dark:text-emerald-500",
    COMPLETED: "text-blue-600 dark:text-blue-500",
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

export function TeacherDashboard({ data }: { data: TeacherDashboardData }) {
    if (!data.ok) {
        return (
            <div className="px-4 py-4 md:px-6">
                <Card className="border-amber-200/80 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <UserCheck className="size-4" />
                            Teacher profile missing
                        </CardTitle>
                        <CardDescription>
                            Your account is missing a teacher profile. Contact
                            an administrator to finish setup.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

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
                    Teaching load and next sessions.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 px-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3 lg:px-6">
                <Kpi
                    label="Upcoming sessions"
                    value={upcomingCount}
                    hint="Confirmed, from now onward"
                />
                <Kpi
                    label="Completed (all time)"
                    value={completedCount}
                    hint="Sessions marked done"
                />
                <Card className="flex flex-col justify-between border-dashed bg-muted/20 shadow-xs @xl/main:col-span-2 @5xl/main:col-span-1">
                    <CardHeader>
                        <CardDescription>Teach &amp; plan</CardDescription>
                        <CardTitle className="text-base">Shortcuts</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2 pb-4">
                        <Button asChild size="sm">
                            <Link href="/bookings">My sessions</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                            <Link href="/teachers">Teachers &amp; availability</Link>
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
                                Next session
                            </CardDescription>
                            <CardTitle className="text-lg">
                                {formatSessionDate(next.scheduledAt)} ·{" "}
                                {formatSessionTime(next.scheduledAt)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <p>
                                <span className="text-muted-foreground">
                                    Student:{" "}
                                </span>
                                <span className="font-medium">
                                    {next.studentName}
                                </span>
                            </p>
                            {next.packageName && (
                                <p>
                                    <span className="text-muted-foreground">
                                        Context:{" "}
                                    </span>
                                    {next.packageName}
                                </p>
                            )}
                            <div className="flex items-center gap-2">
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
                        <CardTitle className="text-lg">Your queue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {upcomingList.length === 0 && !next ? (
                            <p className="text-sm text-muted-foreground">
                                No upcoming sessions. Students book against your
                                published availability.
                            </p>
                        ) : upcomingList.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No other sessions in your queue.
                            </p>
                        ) : (
                            <ul className="space-y-4">
                                {upcomingList.map((b) => (
                                    <li
                                        key={b.id}
                                        className="flex flex-col gap-1 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                                    >
                                        <p className="text-sm font-medium">
                                            {b.studentName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatSessionDate(b.scheduledAt)} ·{" "}
                                            {formatSessionTime(b.scheduledAt)} ·{" "}
                                            {b.duration} min
                                        </p>
                                        <div className="pt-1">
                                            <Button asChild size="sm" variant="link" className="h-auto p-0">
                                                <Link href={`/sessions/${b.id}/room`}>
                                                    Open room →
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
                    <Link
                        href="/question-bank"
                        className="gap-2 text-muted-foreground"
                    >
                        <Notebook size={16} />
                        Question bank
                    </Link>
                </Button>
            </div>
        </div>
    );
}
