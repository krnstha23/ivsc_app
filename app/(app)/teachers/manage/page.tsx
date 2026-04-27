import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { TeachersManageFilter } from "@/components/teachers-manage-filter";
import {
    TeacherApproveButton,
    TeacherToggleActiveButton,
} from "@/components/teacher-manage-actions";
import type { TeacherProfileWhereInput } from "@/app/generated/prisma/models/TeacherProfile";

type SearchParams = {
    approval?: string;
    active?: string;
};

export default async function ManageTeachersPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const role = (session.user as { role?: string }).role as
        | "ADMIN"
        | "TEACHER"
        | "USER"
        | undefined;
    if (!canAccess(role, ["ADMIN"])) redirect("/dashboard");

    const { approval, active } = await searchParams;

    const where: TeacherProfileWhereInput = {};
    if (approval === "approved") where.isApproved = true;
    else if (approval === "pending") where.isApproved = false;
    if (active === "true") where.isActive = true;
    else if (active === "false") where.isActive = false;

    const now = new Date();

    const teachers = await prisma.teacherProfile.findMany({
        where,
        select: {
            id: true,
            isActive: true,
            isApproved: true,
            user: {
                select: {
                    id: true,
                    firstName: true,
                    middleName: true,
                    lastName: true,
                    email: true,
                },
            },
            _count: {
                select: {
                    bookings: true,
                    availability: true,
                },
            },
        },
        orderBy: { user: { lastName: "asc" } },
    });

    const upcomingCounts = await prisma.booking.groupBy({
        by: ["teacherId"],
        where: { scheduledAt: { gte: now } },
        _count: true,
    });
    const upcomingMap = new Map(
        upcomingCounts.map((c) => [c.teacherId, c._count]),
    );

    function fullName(u: {
        firstName: string;
        middleName?: string | null;
        lastName: string;
    }) {
        return [u.firstName, u.middleName, u.lastName]
            .filter(Boolean)
            .join(" ");
    }

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-xl font-semibold">
                            Manage Teachers
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            View all teachers, approve pending accounts, and
                            manage active status.
                        </p>
                    </div>
                    <TeachersManageFilter
                        defaultApproval={approval ?? ""}
                        defaultActive={active ?? ""}
                    />
                </div>
            </div>

            <div className="px-4 lg:px-6">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Approved</TableHead>
                                <TableHead>Active</TableHead>
                                <TableHead className="text-right">
                                    Total Bookings
                                </TableHead>
                                <TableHead className="text-right">
                                    Upcoming
                                </TableHead>
                                <TableHead className="text-right">
                                    Availability
                                </TableHead>
                                <TableHead className="w-[140px] text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teachers.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        No teachers found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                teachers.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell className="font-medium">
                                            {fullName(t.user)}
                                        </TableCell>
                                        <TableCell>{t.user.email}</TableCell>
                                        <TableCell>
                                            {t.isApproved ? (
                                                <Badge variant="default">
                                                    Approved
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">
                                                    Pending
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={
                                                    t.isActive
                                                        ? "font-medium text-green-600 dark:text-green-400"
                                                        : "text-muted-foreground"
                                                }
                                            >
                                                {t.isActive
                                                    ? "Active"
                                                    : "Inactive"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {t._count.bookings}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {upcomingMap.get(t.id) ?? 0}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {t._count.availability}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {!t.isApproved && (
                                                    <TeacherApproveButton
                                                        userId={t.user.id}
                                                    />
                                                )}
                                                <TeacherToggleActiveButton
                                                    teacherId={t.id}
                                                    isActive={t.isActive}
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    aria-label="Edit user"
                                                    asChild
                                                >
                                                    <Link
                                                        href={`/users/${t.user.id}/edit`}
                                                    >
                                                        <Pencil size={16} />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
