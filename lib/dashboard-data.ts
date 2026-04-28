import { prisma } from "@/lib/prisma";

const upcomingStudentStatuses = ["PENDING", "CONFIRMED"] as const;

function utcDayBounds() {
    const now = new Date();
    const start = new Date(
        Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            0,
            0,
            0,
            0,
        ),
    );
    const end = new Date(
        Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            23,
            59,
            59,
            999,
        ),
    );
    return { start, end };
}

const bookingListSelect = {
    id: true,
    scheduledAt: true,
    duration: true,
    status: true,
    meetLink: true,
    package: { select: { name: true } },
} as const;

const bookingWithStudentSelect = {
    id: true,
    scheduledAt: true,
    duration: true,
    status: true,
    meetLink: true,
    user: {
        select: { firstName: true, lastName: true },
    },
    package: { select: { name: true } },
} as const;

export type StudentDashboardBooking = {
    id: string;
    scheduledAt: string;
    duration: number;
    status: string;
    meetLink: string | null;
    packageName: string | null;
    teacherName: string | null;
};

export type TeacherDashboardBooking = {
    id: string;
    scheduledAt: string;
    duration: number;
    status: string;
    meetLink: string | null;
    packageName: string | null;
    studentName: string;
};

export type StudentDashboardData = {
    firstName: string;
    upcomingCount: number;
    completedCount: number;
    activeEnrollments: number;
    upcoming: StudentDashboardBooking[];
    next: StudentDashboardBooking | null;
};

export type TeacherDashboardData =
    | { ok: true; firstName: string; upcomingCount: number; completedCount: number; upcoming: TeacherDashboardBooking[]; next: TeacherDashboardBooking | null }
    | { ok: false; reason: "no_profile" };

export type AdminDashboardData = {
    userCount: number;
    teacherCount: number;
    approvedTeachers: number;
    pendingBookings: number;
    sessionsToday: number;
};

export async function getStudentDashboardData(
    userId: string,
): Promise<StudentDashboardData> {
    const now = new Date();

    const [user, upcoming, upcomingCount, completedCount, enrollmentCount] =
        await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { firstName: true },
            }),
            prisma.booking.findMany({
                where: {
                    userId,
                    status: { in: [...upcomingStudentStatuses] },
                    scheduledAt: { gte: now },
                },
                select: {
                    ...bookingListSelect,
                    teacher: {
                        select: {
                            user: {
                                select: { firstName: true, lastName: true },
                            },
                        },
                    },
                },
                orderBy: { scheduledAt: "asc" },
                take: 5,
            }),
            prisma.booking.count({
                where: {
                    userId,
                    status: { in: [...upcomingStudentStatuses] },
                    scheduledAt: { gte: now },
                },
            }),
            prisma.booking.count({
                where: { userId, status: "COMPLETED" },
            }),
            prisma.studentEnrollment.count({
                where: {
                    status: "ACTIVE",
                    student: { userId: userId },
                },
            }),
        ]);

    const mapOne = (
        b: (typeof upcoming)[number],
    ): StudentDashboardBooking => {
        const t = b.teacher.user;
        const teacherName = [t.firstName, t.lastName].filter(Boolean).join(" ");
        return {
            id: b.id,
            scheduledAt: b.scheduledAt.toISOString(),
            duration: b.duration,
            status: b.status,
            meetLink: b.meetLink,
            packageName: b.package?.name ?? null,
            teacherName: teacherName || null,
        };
    };

    const list = upcoming.map(mapOne);
    return {
        firstName: user?.firstName ?? "there",
        upcomingCount,
        completedCount,
        activeEnrollments: enrollmentCount,
        upcoming: list,
        next: list[0] ?? null,
    };
}

export async function getTeacherDashboardData(
    userId: string,
): Promise<TeacherDashboardData> {
    const teacher = await prisma.teacherProfile.findUnique({
        where: { userId },
        select: {
            id: true,
            user: { select: { firstName: true } },
        },
    });
    if (!teacher) {
        return { ok: false, reason: "no_profile" };
    }

    const now = new Date();

    const [upcoming, upcomingCount, completedCount] = await Promise.all([
        prisma.booking.findMany({
            where: {
                teacherId: teacher.id,
                status: "CONFIRMED",
                scheduledAt: { gte: now },
            },
            select: bookingWithStudentSelect,
            orderBy: { scheduledAt: "asc" },
            take: 5,
        }),
        prisma.booking.count({
            where: {
                teacherId: teacher.id,
                status: "CONFIRMED",
                scheduledAt: { gte: now },
            },
        }),
        prisma.booking.count({
            where: { teacherId: teacher.id, status: "COMPLETED" },
        }),
    ]);

    const mapOne = (b: (typeof upcoming)[number]): TeacherDashboardBooking => ({
        id: b.id,
        scheduledAt: b.scheduledAt.toISOString(),
        duration: b.duration,
        status: b.status,
        meetLink: b.meetLink,
        packageName: b.package?.name ?? null,
        studentName: [b.user.firstName, b.user.lastName].filter(Boolean).join(" "),
    });

    const list = upcoming.map(mapOne);
    return {
        ok: true,
        firstName: teacher.user.firstName,
        upcomingCount,
        completedCount,
        upcoming: list,
        next: list[0] ?? null,
    };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
    const { start, end } = utcDayBounds();
    const [
        userCount,
        teacherCount,
        approvedTeachers,
        pendingBookings,
        sessionsToday,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: "TEACHER" } }),
        prisma.teacherProfile.count({ where: { isApproved: true, isActive: true } }),
        prisma.booking.count({ where: { status: "PENDING" } }),
        prisma.booking.count({
            where: {
                scheduledAt: { gte: start, lte: end },
                status: { in: ["PENDING", "CONFIRMED"] },
            },
        }),
    ]);

    return {
        userCount,
        teacherCount,
        approvedTeachers,
        pendingBookings,
        sessionsToday,
    };
}
