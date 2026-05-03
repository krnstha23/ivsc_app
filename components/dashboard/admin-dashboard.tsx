import Link from "next/link";
import {
    AlarmAdd,
    UsersGroupRounded,
    UserCheck,
    CartLarge2,
} from "@solar-icons/react/ssr";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import type { AdminDashboardData } from "@/lib/dashboard-data";

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

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
    return (
        <div className="flex flex-col gap-6 py-2 md:gap-8">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">Admin overview</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    High-level counts and quick access to management areas.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-3 dark:*:data-[slot=card]:bg-card lg:px-6">
                <Kpi
                    label="Users"
                    value={data.userCount}
                    hint="All accounts in the system"
                />
                <Kpi
                    label="Teacher accounts"
                    value={data.teacherCount}
                    hint="Users with teacher role"
                />
                <Kpi
                    label="Approved & active teachers"
                    value={data.approvedTeachers}
                    hint="Can be assigned to sessions"
                />
                <Kpi
                    label="Pending bookings"
                    value={data.pendingBookings}
                    hint="Awaiting confirmation or payment"
                />
                <Kpi
                    label="Sessions (UTC today)"
                    value={data.sessionsToday}
                    hint="Pending or confirmed, scheduled today"
                />
            </div>

            <div className="px-4 lg:px-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Operations</CardTitle>
                        <CardDescription>
                            Jump to common admin screens
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="secondary">
                            <Link href="/users" className="gap-1.5">
                                <UsersGroupRounded size={16} />
                                Users
                            </Link>
                        </Button>
                        <Button asChild size="sm" variant="secondary">
                            <Link href="/teachers/manage" className="gap-1.5">
                                <UserCheck size={16} />
                                Teachers
                            </Link>
                        </Button>
                        <Button asChild size="sm" variant="secondary">
                            <Link href="/packages" className="gap-1.5">
                                <CartLarge2 size={16} />
                                Packages
                            </Link>
                        </Button>
                        <Button asChild size="sm" variant="secondary">
                            <Link href="/calendar" className="gap-1.5">
                                <AlarmAdd size={16} />
                                Calendar
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
