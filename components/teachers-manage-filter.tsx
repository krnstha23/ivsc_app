"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function TeachersManageFilter({
    defaultApproval,
    defaultActive,
}: {
    defaultApproval: string;
    defaultActive: string;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [approval, setApproval] = useState(defaultApproval || "all");
    const [active, setActive] = useState(defaultActive || "all");

    useEffect(() => {
        setApproval(defaultApproval || "all");
        setActive(defaultActive || "all");
    }, [defaultApproval, defaultActive]);

    function apply(filters: { approval: string; active: string }) {
        const params = new URLSearchParams();
        if (filters.approval !== "all") params.set("approval", filters.approval);
        if (filters.active !== "all") params.set("active", filters.active);
        startTransition(() => {
            router.push(
                `/teachers/manage${params.toString() ? `?${params.toString()}` : ""}`,
            );
        });
    }

    return (
        <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
            <div className="flex flex-col gap-2">
                <Label htmlFor="filter-approval">Approval status</Label>
                <Select
                    value={approval}
                    onValueChange={(v) => {
                        setApproval(v);
                        apply({ approval: v, active });
                    }}
                >
                    <SelectTrigger id="filter-approval" className="w-36">
                        <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="filter-active">Active status</Label>
                <Select
                    value={active}
                    onValueChange={(v) => {
                        setActive(v);
                        apply({ approval, active: v });
                    }}
                >
                    <SelectTrigger id="filter-active" className="w-36">
                        <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Button
                type="button"
                variant="outline"
                onClick={() => {
                    setApproval("all");
                    setActive("all");
                    startTransition(() => router.push("/teachers/manage"));
                }}
                disabled={isPending}
            >
                Reset
            </Button>
        </div>
    );
}
