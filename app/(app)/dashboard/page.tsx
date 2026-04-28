import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";
import {
    getAdminDashboardData,
    getStudentDashboardData,
    getTeacherDashboardData,
} from "@/lib/dashboard-data";
import { auth } from "@/lib/auth";
import type { Role } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const session = await auth();
    if (!session?.user) {
        redirect("/login");
    }

    const user = session.user as { id?: string; role?: string };
    const role = user.role as Role | undefined;
    const userId = user.id;
    if (!role || !userId) {
        redirect("/login");
    }

    if (role === "USER") {
        const data = await getStudentDashboardData(userId);
        return (
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <StudentDashboard data={data} />
            </div>
        );
    }

    if (role === "TEACHER") {
        const data = await getTeacherDashboardData(userId);
        return (
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <TeacherDashboard data={data} />
            </div>
        );
    }

    if (role === "ADMIN") {
        const data = await getAdminDashboardData();
        return (
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <AdminDashboard data={data} />
            </div>
        );
    }

    redirect("/login");
}
