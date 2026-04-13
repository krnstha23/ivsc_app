import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccess, type Role } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const STATUS_BAR_COLORS: Record<string, string> = {
    CONFIRMED: "bg-green-500",
    PENDING: "bg-amber-500",
    COMPLETED: "bg-blue-500",
    CANCELLED: "bg-red-500",
};

const STATUS_DOT_COLORS: Record<string, string> = {
    CONFIRMED: "bg-green-500",
    PENDING: "bg-amber-500",
    COMPLETED: "bg-blue-500",
    CANCELLED: "bg-red-500",
};

export default async function ReportsPage() {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const role = (session.user as { role?: string }).role as Role | undefined;
    if (!canAccess(role, ["ADMIN"])) redirect("/dashboard");

    const now = new Date();

    const weekStart = new Date(now);
    const day = weekStart.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
        totalBookings,
        weekBookings,
        monthBookings,
        activeTeachers,
        statusCounts,
        teacherStats,
        monthlyBookings,
    ] = await Promise.all([
        prisma.booking.count(),
        prisma.booking.count({
            where: { scheduledAt: { gte: weekStart, lt: weekEnd } },
        }),
        prisma.booking.count({
            where: { scheduledAt: { gte: monthStart, lt: monthEnd } },
        }),
        prisma.teacherProfile.count({
            where: { isActive: true, isApproved: true },
        }),
        prisma.booking.groupBy({
            by: ["status"],
            _count: true,
        }),
        prisma.teacherProfile.findMany({
            where: { isActive: true },
            select: {
                id: true,
                user: {
                    select: {
                        firstName: true,
                        middleName: true,
                        lastName: true,
                    },
                },
                _count: { select: { bookings: true } },
                bookings: { select: { status: true } },
            },
            orderBy: { bookings: { _count: "desc" } },
        }),
        prisma.booking.findMany({
            where: { scheduledAt: { gte: sixMonthsAgo } },
            select: { scheduledAt: true, status: true },
        }),
    ]);

    const statusMap: Record<string, number> = {
        PENDING: 0,
        CONFIRMED: 0,
        CANCELLED: 0,
        COMPLETED: 0,
    };
    for (const sc of statusCounts) {
        statusMap[sc.status] = sc._count;
    }
    const statusTotal = Object.values(statusMap).reduce((a, b) => a + b, 0);

    function fullName(u: {
        firstName: string;
        middleName?: string | null;
        lastName: string;
    }) {
        return [u.firstName, u.middleName, u.lastName]
            .filter(Boolean)
            .join(" ");
    }

    const teacherData = teacherStats.map((t) => {
        const total = t._count.bookings;
        const completed = t.bookings.filter(
            (b) => b.status === "COMPLETED"
        ).length;
        const cancelled = t.bookings.filter(
            (b) => b.status === "CANCELLED"
        ).length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { id: t.id, name: fullName(t.user), total, completed, cancelled, rate };
    });

    const monthlyMap = new Map<
        string,
        { bookings: number; completed: number }
    >();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyMap.set(key, { bookings: 0, completed: 0 });
    }
    for (const b of monthlyBookings) {
        const d = b.scheduledAt;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const entry = monthlyMap.get(key);
        if (entry) {
            entry.bookings++;
            if (b.status === "COMPLETED") entry.completed++;
        }
    }
    const monthlyTrend = Array.from(monthlyMap.entries()).map(
        ([month, data]) => ({
            month,
            label: new Date(month + "-01").toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
            }),
            ...data,
        })
    );

    const summaryCards = [
        { title: "Total Bookings", value: totalBookings },
        { title: "This Week", value: weekBookings },
        { title: "This Month", value: monthBookings },
        { title: "Active Teachers", value: activeTeachers },
    ];

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">Reports</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Overview of bookings, teacher utilization, and trends.
                </p>
            </div>

            {/* Summary Cards */}
            <div className="px-4 lg:px-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {summaryCards.map((card) => (
                        <Card key={card.title}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {card.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {card.value}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Booking Status Breakdown */}
            <div className="px-4 lg:px-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Booking Status Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {statusTotal > 0 ? (
                            <>
                                <div className="mb-4 flex h-4 overflow-hidden rounded-full">
                                    {Object.entries(statusMap).map(
                                        ([status, count]) =>
                                            count > 0 ? (
                                                <div
                                                    key={status}
                                                    className={`${STATUS_BAR_COLORS[status]} transition-all`}
                                                    style={{
                                                        width: `${(count / statusTotal) * 100}%`,
                                                    }}
                                                    title={`${status}: ${count}`}
                                                />
                                            ) : null
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                    {Object.entries(statusMap).map(
                                        ([status, count]) => (
                                            <div
                                                key={status}
                                                className="flex items-center gap-1.5"
                                            >
                                                <div
                                                    className={`h-3 w-3 rounded-full ${STATUS_DOT_COLORS[status]}`}
                                                />
                                                <span className="text-muted-foreground">
                                                    {status.charAt(0) +
                                                        status
                                                            .slice(1)
                                                            .toLowerCase()}
                                                    :
                                                </span>
                                                <span className="font-medium">
                                                    {count}
                                                </span>
                                            </div>
                                        )
                                    )}
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No bookings yet.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Teacher Utilization */}
            <div className="px-4 lg:px-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Teacher Utilization</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Teacher</TableHead>
                                        <TableHead className="text-right">
                                            Total
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Completed
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Cancelled
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Completion Rate
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {teacherData.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="h-24 text-center text-muted-foreground"
                                            >
                                                No teacher data.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        teacherData.map((t) => (
                                            <TableRow key={t.id}>
                                                <TableCell className="font-medium">
                                                    {t.name}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {t.total}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {t.completed}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {t.cancelled}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {t.rate}%
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Trend */}
            <div className="px-4 lg:px-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Monthly Trend (Last 6 Months)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Month</TableHead>
                                        <TableHead className="text-right">
                                            Bookings
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Completed
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {monthlyTrend.map((m) => (
                                        <TableRow key={m.month}>
                                            <TableCell className="font-medium">
                                                {m.label}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {m.bookings}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {m.completed}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
