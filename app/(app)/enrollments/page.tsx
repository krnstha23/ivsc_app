import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canAccess, type Role } from "@/lib/permissions";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EnrollmentActions } from "./enrollment-actions";

function statusVariant(status: string) {
    switch (status) {
        case "ACTIVE":
            return "default" as const;
        case "COMPLETED":
            return "secondary" as const;
        case "CANCELLED":
            return "destructive" as const;
        default:
            return "outline" as const;
    }
}

export default async function EnrollmentsPage() {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const role = (session.user as { role?: string }).role as Role | undefined;
    if (!canAccess(role, ["ADMIN"])) {
        redirect("/dashboard");
    }

    const enrollments = await prisma.studentEnrollment.findMany({
        select: {
            id: true,
            classesTotal: true,
            classesUsed: true,
            status: true,
            enrolledAt: true,
            student: {
                select: {
                    user: {
                        select: { firstName: true, lastName: true, email: true },
                    },
                },
            },
            package: { select: { id: true, name: true } },
        },
        orderBy: [
            { student: { user: { firstName: "asc" } } },
            { student: { user: { lastName: "asc" } } },
            { package: { name: "asc" } },
        ],
    });

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="flex items-center justify-between px-4 lg:px-6">
                <div>
                    <h1 className="text-xl font-semibold">Enrollments</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage all student-package enrollments.
                    </p>
                </div>
                <Button asChild size="sm">
                    <Link href="/enrollments/assign">Assign package</Link>
                </Button>
            </div>

            <div className="px-4 lg:px-6">
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Package</TableHead>
                                <TableHead className="text-center">
                                    Classes Joined
                                </TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead>Enrolled</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {enrollments.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="py-8 text-center text-muted-foreground"
                                    >
                                        No enrollments yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                enrollments.map((e) => (
                                    <TableRow key={e.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">
                                                    {e.student.user.firstName}{" "}
                                                    {e.student.user.lastName}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {e.student.user.email}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={`/packages/${e.package.id}`}
                                                className="hover:underline"
                                            >
                                                {e.package.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-sm">
                                                {e.classesUsed} joined
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={statusVariant(e.status)}>
                                                {e.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {e.enrolledAt.toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <EnrollmentActions
                                                enrollmentId={e.id}
                                                currentClassesTotal={e.classesTotal}
                                                currentStatus={e.status}
                                            />
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
