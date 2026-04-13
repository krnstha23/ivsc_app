import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccess, type Role } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { TimetableView } from "@/components/timetable-view";

type SearchParams = {
    teacher?: string;
    student?: string;
    status?: string;
    weekStart?: string;
};

function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

export default async function TimetablePage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const role = (session.user as { role?: string }).role as Role | undefined;
    if (!canAccess(role, ["ADMIN"])) redirect("/dashboard");

    const {
        teacher,
        student,
        status,
        weekStart: weekStartParam,
    } = await searchParams;

    const weekStart = weekStartParam
        ? getMonday(new Date(weekStartParam))
        : getMonday(new Date());

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const where: Record<string, unknown> = {
        scheduledAt: { gte: weekStart, lt: weekEnd },
    };
    if (teacher) where.teacherId = teacher;
    if (student) where.userId = student;
    if (
        status &&
        ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"].includes(status)
    ) {
        where.status = status;
    }

    const [bookings, teachers, students] = await Promise.all([
        prisma.booking.findMany({
            where,
            select: {
                id: true,
                scheduledAt: true,
                duration: true,
                status: true,
                meetLink: true,
                user: {
                    select: {
                        firstName: true,
                        middleName: true,
                        lastName: true,
                    },
                },
                teacher: {
                    select: {
                        id: true,
                        user: {
                            select: {
                                firstName: true,
                                middleName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
            orderBy: { scheduledAt: "asc" },
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
            },
            orderBy: { user: { lastName: "asc" } },
        }),
        prisma.user.findMany({
            where: { role: "USER", isActive: true },
            select: {
                id: true,
                firstName: true,
                middleName: true,
                lastName: true,
            },
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        }),
    ]);

    function fullName(u: {
        firstName: string;
        middleName?: string | null;
        lastName: string;
    }) {
        return [u.firstName, u.middleName, u.lastName]
            .filter(Boolean)
            .join(" ");
    }

    const serializedBookings = bookings.map((b) => ({
        id: b.id,
        scheduledAt: b.scheduledAt.toISOString(),
        duration: b.duration,
        status: b.status,
        meetLink: b.meetLink,
        studentName: fullName(b.user),
        teacherName: fullName(b.teacher.user),
        teacherId: b.teacher.id,
    }));

    const teacherOptions = teachers.map((t) => ({
        id: t.id,
        name: fullName(t.user),
    }));

    const studentOptions = students.map((s) => ({
        id: s.id,
        name: fullName(s),
    }));

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">Master Timetable</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    View all bookings across teachers and students in a weekly
                    calendar.
                </p>
            </div>
            <div className="px-4 lg:px-6">
                <TimetableView
                    bookings={serializedBookings}
                    teachers={teacherOptions}
                    students={studentOptions}
                    weekStart={weekStart.toISOString()}
                    filters={{
                        teacher: teacher ?? "",
                        student: student ?? "",
                        status: status ?? "",
                    }}
                />
            </div>
        </div>
    );
}
