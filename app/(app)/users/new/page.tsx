import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/permissions";
import { CreateUserForm } from "@/components/create-user-form";

export default async function NewUserPage() {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const role = (session.user as { role?: string }).role as
        | "ADMIN"
        | "TEACHER"
        | "USER"
        | undefined;
    if (!canAccess(role, ["ADMIN"])) redirect("/dashboard");

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">Create user</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Add a new user to the system.
                </p>
            </div>
            <div className="px-4 lg:px-6">
                <CreateUserForm />
            </div>
        </div>
    );
}
