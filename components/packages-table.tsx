"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pen, TrashBinTrash } from "@solar-icons/react";

import { deletePackage } from "@/app/(app)/packages/actions";
import { formatRs } from "@/lib/format-rs";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type PackageRow = {
    id: string;
    name: string;
    description: string | null;
    price: number;
    isActive: boolean;
};

export function PackagesTable({
    packages,
    canManage,
}: {
    packages: PackageRow[];
    canManage: boolean;
}) {
    const router = useRouter();

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        {canManage && <TableHead className="w-[1%]" />}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {packages.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={canManage ? 5 : 4}
                                className="h-24 text-center text-muted-foreground"
                            >
                                No packages found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        packages.map((pkg) => (
                            <TableRow
                                key={pkg.id}
                                className={
                                    canManage
                                        ? "cursor-pointer"
                                        : undefined
                                }
                                onClick={() => {
                                    if (!canManage) return;
                                    router.push(`/packages/${pkg.id}/edit`);
                                }}
                            >
                                <TableCell className="font-medium">
                                    <Link
                                        href={`/packages/${pkg.id}`}
                                        className="hover:underline focus:underline"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {pkg.name}
                                    </Link>
                                </TableCell>
                                <TableCell className="max-w-xs truncate text-muted-foreground">
                                    {pkg.description ?? "—"}
                                </TableCell>
                                <TableCell>
                                    {formatRs(Number(pkg.price))}
                                </TableCell>
                                <TableCell>
                                    <span
                                        className={
                                            pkg.isActive
                                                ? "text-green-600 dark:text-green-400 font-medium"
                                                : "text-muted-foreground"
                                        }
                                    >
                                        {pkg.isActive ? "Active" : "Inactive"}
                                    </span>
                                </TableCell>
                                {canManage && (
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                aria-label="Edit package"
                                                asChild
                                            >
                                                <Link href={`/packages/${pkg.id}/edit`}>
                                                    <Pen size={16} />
                                                </Link>
                                            </Button>
                                            <form
                                                action={deletePackage}
                                                className="inline"
                                            >
                                                <input
                                                    type="hidden"
                                                    name="id"
                                                    value={pkg.id}
                                                />
                                                <Button
                                                    type="submit"
                                                    variant="destructive"
                                                    size="icon"
                                                    aria-label="Delete package"
                                                >
                                                    <TrashBinTrash size={16} />
                                                </Button>
                                            </form>
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

