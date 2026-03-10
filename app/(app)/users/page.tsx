import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { UserWhereInput } from "@/app/generated/prisma/models/User";
import { UsersHeaderWithFilter } from "@/components/users-header-with-filter";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type SearchParams = {
    name?: string;
    username?: string;
    isActive?: string;
    role?: string;
};

export default async function UsersPage({
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

    const {
        name,
        username: usernameParam,
        isActive,
        role: roleFilter,
    } = await searchParams;

    const where: UserWhereInput = {};

    if (name?.trim()) {
        const term = name.trim();
        where.OR = [
            { firstName: { contains: term, mode: "insensitive" } },
            { lastName: { contains: term, mode: "insensitive" } },
            { middleName: { contains: term, mode: "insensitive" } },
            { userName: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
        ];
    }

    if (usernameParam?.trim()) {
        where.userName = {
            contains: usernameParam.trim(),
            mode: "insensitive",
        };
    }

    if (isActive === "true") where.isActive = true;
    else if (isActive === "false") where.isActive = false;

    if (
        roleFilter === "ADMIN" ||
        roleFilter === "TEACHER" ||
        roleFilter === "USER"
    ) {
        where.role = roleFilter;
    }

    const users = await prisma.user.findMany({
        where,
        select: {
            id: true,
            userName: true,
            email: true,
            firstName: true,
            middleName: true,
            lastName: true,
            role: true,
            isActive: true,
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

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
                <UsersHeaderWithFilter
                    defaultName={name ?? ""}
                    defaultUsername={usernameParam ?? ""}
                    defaultIsActive={isActive ?? ""}
                    defaultRole={roleFilter ?? ""}
                />
            </div>

            <div className="px-4 lg:px-6">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Username</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>User type</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        No users found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell className="font-medium">
                                            {fullName(u)}
                                        </TableCell>
                                        <TableCell>{u.userName}</TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {u.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={
                                                    u.isActive
                                                        ? "text-green-600 dark:text-green-400 font-medium"
                                                        : "text-muted-foreground"
                                                }
                                            >
                                                {u.isActive
                                                    ? "Active"
                                                    : "Inactive"}
                                            </span>
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
