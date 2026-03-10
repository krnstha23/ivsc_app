import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TeachersCalendarWithPopup } from "@/components/teachers-calendar-with-popup";

export default async function TeachersPage() {
    const session = await auth();
    if (!session?.user) {
        redirect("/login");
    }

    const role = (session.user as { role?: string }).role;
    const canCreate = role === "TEACHER" || role === "ADMIN";

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">Teachers</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {canCreate
                        ? "Click a date to add availability. Choose duration and time in the popup."
                        : "View teacher availability. Click a slot count to see the day\u2019s schedule."}
                </p>
            </div>
            <div className="px-4 lg:px-6">
                <TeachersCalendarWithPopup canCreate={canCreate} />
            </div>
        </div>
    );
}
