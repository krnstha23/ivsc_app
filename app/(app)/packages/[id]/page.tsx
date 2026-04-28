import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/permissions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    getEnrollmentForPackage,
} from "@/app/(app)/packages/actions";
import { formatRs } from "@/lib/format-rs";

export default async function PackageDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const { id: packageId } = await params;
    const pkg = await prisma.package.findUnique({
        where: { id: packageId },
        select: {
            id: true,
            name: true,
            description: true,
            price: true,
            isActive: true,
        },
    });
    if (!pkg) notFound();

    const role = (session.user as { role?: string }).role as
        | "ADMIN"
        | "TEACHER"
        | "USER"
        | undefined;
    const isAdmin = canAccess(role, ["ADMIN"]);
    const enrollment = await getEnrollmentForPackage(packageId);

    const enrolledStudents = isAdmin
        ? await prisma.studentEnrollment.findMany({
              where: { packageId },
              select: {
                  id: true,
                  classesTotal: true,
                  classesUsed: true,
                  status: true,
                  enrolledAt: true,
                  student: {
                      select: {
                          user: {
                              select: {
                                  firstName: true,
                                  lastName: true,
                                  email: true,
                              },
                          },
                      },
                  },
              },
              orderBy: [
                  { student: { user: { firstName: "asc" } } },
                  { student: { user: { lastName: "asc" } } },
              ],
          })
        : [];

    return (
        <div className="flex flex-col gap-6 py-4 md:py-6">
            <div className="px-4 lg:px-6 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-xl font-semibold">{pkg.name}</h1>
                    <div className="flex gap-2">
                        {isAdmin && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href={`/packages/${pkg.id}/edit`}>
                                    Edit package
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
                {pkg.description && (
                    <p className="text-muted-foreground">{pkg.description}</p>
                )}
                <p className="text-lg font-medium">
                    {formatRs(Number(pkg.price))}
                </p>
                {!pkg.isActive && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                        This package is currently inactive.
                    </p>
                )}
            </div>

            {enrollment && (
                <div className="px-4 lg:px-6">
                    <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                        <span className="font-medium">Your enrollment: </span>
                        <span className="text-muted-foreground">
                            {enrollment.classesRemaining} of{" "}
                            {enrollment.classesTotal} classes remaining.
                        </span>
                    </div>
                </div>
            )}

            {role === "USER" && (
                <div className="px-4 lg:px-6">
                    {enrollment && enrollment.classesRemaining > 0 ? (
                        <div className="flex flex-col gap-2">
                            <p className="text-sm text-muted-foreground">
                                You have {enrollment.classesRemaining} class
                                {enrollment.classesRemaining !== 1 ? "es" : ""}{" "}
                                remaining. Book a session below.
                            </p>
                            <Button asChild>
                                <Link href={`/packages/${pkg.id}/book`}>
                                    Book a session →
                                </Link>
                            </Button>
                        </div>
                    ) : enrollment ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
                            You have no classes left in this package. Contact
                            your administrator to purchase more.
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                            <Calendar size={16} aria-hidden />
                            <span>
                                You need to be enrolled in this package to book
                                sessions. Contact your administrator.
                            </span>
                        </div>
                    )}
                </div>
            )}

            {isAdmin && (
                <div className="px-4 lg:px-6 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">
                            Enrolled Students
                        </h2>
                        <Button size="sm" asChild>
                            <Link href="/enrollments/assign">
                                Assign student
                            </Link>
                        </Button>
                    </div>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead className="text-center">
                                        Progress
                                    </TableHead>
                                    <TableHead className="text-center">
                                        Status
                                    </TableHead>
                                    <TableHead>Enrolled</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {enrolledStudents.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={4}
                                            className="text-center text-muted-foreground py-6"
                                        >
                                            No students enrolled in this
                                            package.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    enrolledStudents.map((e) => {
                                        const remaining =
                                            e.classesTotal - e.classesUsed;
                                        const pct =
                                            e.classesTotal > 0
                                                ? Math.round(
                                                      (e.classesUsed /
                                                          e.classesTotal) *
                                                          100
                                                  )
                                                : 0;
                                        return (
                                            <TableRow key={e.id}>
                                                <TableCell>
                                                    <p className="font-medium">
                                                        {
                                                            e.student.user
                                                                .firstName
                                                        }{" "}
                                                        {
                                                            e.student.user
                                                                .lastName
                                                        }
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {
                                                            e.student.user
                                                                .email
                                                        }
                                                    </p>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-xs text-muted-foreground">
                                                            {e.classesUsed} /{" "}
                                                            {e.classesTotal}{" "}
                                                            &middot;{" "}
                                                            {remaining} left
                                                        </span>
                                                        <div className="h-2 w-full max-w-24 rounded-full bg-muted">
                                                            <div
                                                                className="h-full rounded-full bg-primary transition-all"
                                                                style={{
                                                                    width: `${pct}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge
                                                        variant={
                                                            e.status ===
                                                            "ACTIVE"
                                                                ? "default"
                                                                : e.status ===
                                                                    "COMPLETED"
                                                                  ? "secondary"
                                                                  : "destructive"
                                                        }
                                                    >
                                                        {e.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {e.enrolledAt.toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            <div className="px-4 lg:px-6">
                <Button variant="ghost" size="sm" asChild>
                    <Link
                        href={isAdmin ? "/packages" : "/dashboard"}
                    >
                        {isAdmin
                            ? "← Back to packages"
                            : "← Back to dashboard"}
                    </Link>
                </Button>
            </div>
        </div>
    );
}
