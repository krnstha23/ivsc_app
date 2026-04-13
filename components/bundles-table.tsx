"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { deletePackageBundle } from "@/app/(app)/packages/actions";
type BundleRow = {
    id: string;
    name: string;
    description: string | null;
    priceStandard: number;
    pricePriority: number;
    priceInstant: number;
    duration: number;
    hasEvaluation: boolean;
    discountPercent: number | null;
    isActive: boolean;
    isFeatured: boolean;
    packageIds: string[];
};

function formatMoney(value: number) {
    return `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function formatPercent(value: number | null) {
    if (value == null) return "—";
    return `${Number(value)}%`;
}

function BundleRow({
    bundle,
    canManage,
}: {
    bundle: BundleRow;
    canManage: boolean;
}) {
    const router = useRouter();
    return (
        <TableRow
            className={canManage ? "cursor-pointer" : undefined}
            onClick={() => {
                if (!canManage) return;
                router.push(`/packages/bundles/${bundle.id}/edit`);
            }}
        >
            <TableCell className="font-medium">
                <div>{bundle.name}</div>
                <div className="text-xs text-muted-foreground">
                    {bundle.duration} min
                    {bundle.hasEvaluation ? " · Eval" : ""}
                </div>
            </TableCell>
            <TableCell className="max-w-xs truncate text-muted-foreground">
                {bundle.description ?? "—"}
            </TableCell>
            <TableCell className="align-top text-sm">
                <div className="space-y-0.5 tabular-nums">
                    <div>Std {formatMoney(bundle.priceStandard)}</div>
                    <div className="text-muted-foreground">
                        Pri {formatMoney(bundle.pricePriority)}
                    </div>
                    <div className="text-muted-foreground">
                        Inst {formatMoney(bundle.priceInstant)}
                    </div>
                </div>
            </TableCell>
            <TableCell className="tabular-nums">
                {formatPercent(bundle.discountPercent)}
            </TableCell>
            <TableCell className="tabular-nums">{bundle.packageIds.length}</TableCell>
            <TableCell>
                <span
                    className={
                        bundle.isActive
                            ? "text-green-600 dark:text-green-400 font-medium"
                            : "text-muted-foreground"
                    }
                >
                    {bundle.isActive ? "Active" : "Inactive"}
                    {bundle.isFeatured ? " • Featured" : ""}
                </span>
            </TableCell>
            {canManage && (
                <TableCell>
                    <form
                        action={deletePackageBundle}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <input type="hidden" name="bundleId" value={bundle.id} />
                        <Button
                            type="submit"
                            variant="destructive"
                            size="xs"
                        >
                            Delete
                        </Button>
                    </form>
                </TableCell>
            )}
        </TableRow>
    );
}

export function BundlesTable({
    bundles,
    canManage,
}: {
    bundles: BundleRow[];
    canManage: boolean;
}) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Prices (Std / Pri / Inst)</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Packages</TableHead>
                        <TableHead>Status</TableHead>
                        {canManage && <TableHead className="w-[1%]" />}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {bundles.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={canManage ? 7 : 6}
                                className="h-24 text-center text-muted-foreground"
                            >
                                No bundles found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        bundles.map((b) => (
                            <BundleRow
                                key={b.id}
                                bundle={b}
                                canManage={canManage}
                            />
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

