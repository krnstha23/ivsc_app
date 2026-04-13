import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canAccess, type Role } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    DeletePageButton,
    ToggleActiveButton,
} from "@/components/static-page-actions";

function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export default async function StaticPagesListPage() {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const role = (session.user as { role?: string }).role as Role | undefined;
    if (!canAccess(role, ["ADMIN"])) redirect("/dashboard");

    const pages = await prisma.staticPage.findMany({
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Static Pages</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Create and manage public content pages linked from
                            the site.
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/pages/new">New Page</Link>
                    </Button>
                </div>
            </div>

            <div className="px-4 lg:px-6">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Modified</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pages.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        No static pages yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pages.map((page: typeof pages[number]) => (
                                    <TableRow key={page.id}>
                                        <TableCell className="font-medium">
                                            {page.title}
                                        </TableCell>
                                        <TableCell>
                                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                                                {page.slug}
                                            </code>
                                        </TableCell>
                                        <TableCell>
                                            {page.isActive ? (
                                                <Badge
                                                    className="border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                    variant="secondary"
                                                >
                                                    Active
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    className="border-transparent bg-muted text-muted-foreground"
                                                    variant="secondary"
                                                >
                                                    Inactive
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(page.createdAt)}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(page.updatedAt)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap items-center justify-end gap-2">
                                                <Button
                                                    variant="link"
                                                    className="h-auto p-0"
                                                    asChild
                                                >
                                                    <Link
                                                        href={`/pages/${page.id}/edit`}
                                                    >
                                                        Edit
                                                    </Link>
                                                </Button>
                                                <ToggleActiveButton
                                                    id={page.id}
                                                    isActive={page.isActive}
                                                />
                                                <DeletePageButton id={page.id} />
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
