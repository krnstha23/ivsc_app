import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { EditUserForm } from "@/components/edit-user-form";
import { z } from "zod/v4";

type SearchParams = { error?: string };

export default async function EditUserPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<SearchParams>;
}) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const adminRole = (session.user as { role?: string }).role as
        | "ADMIN"
        | "TEACHER"
        | "USER"
        | undefined;
    if (!canAccess(adminRole, ["ADMIN"])) redirect("/dashboard");

    const { id } = await params;
    const idParsed = z.string().uuid().safeParse(id);
    if (!idParsed.success) redirect("/users");

    const { error: errorParam } = await searchParams;

    const user = await prisma.user.findUnique({
        where: { id: idParsed.data },
        select: {
            id: true,
            userName: true,
            email: true,
            firstName: true,
            middleName: true,
            lastName: true,
            phone: true,
            role: true,
            isActive: true,
        },
    });

    if (!user) redirect("/users");

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">Edit user</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Update account details, role, and status.
                </p>
            </div>
            <div className="px-4 lg:px-6">
                <EditUserForm
                    user={user}
                    error={
                        errorParam
                            ? decodeURIComponent(errorParam)
                            : undefined
                    }
                />
            </div>
        </div>
    );
}
