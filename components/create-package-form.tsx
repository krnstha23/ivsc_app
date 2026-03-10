"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { createPackage, updatePackage } from "@/app/(app)/packages/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function CreatePackageForm({
    mode = "create",
    initial,
}: {
    mode?: "create" | "edit";
    initial?: {
        id: string;
        name: string;
        description: string | null;
        price: number;
        isActive: boolean;
    };
}) {
    const [isActive, setIsActive] = useState<"true" | "false">(
        initial?.isActive === false ? "false" : "true",
    );
    const [, formAction] = useActionState(
        async (_: unknown, formData: FormData) => {
            if (mode === "edit") {
                await updatePackage(formData);
            } else {
                await createPackage(formData);
            }
        },
        null,
    );

    return (
        <form
            action={formAction}
            className="flex w-full flex-col gap-6 rounded-lg border bg-card p-6 shadow-sm"
        >
            {mode === "edit" && (
                <input type="hidden" name="id" value={initial?.id ?? ""} />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="name">Package name</Label>
                    <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        placeholder="e.g. Math 10"
                        defaultValue={initial?.name ?? ""}
                    />
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                        id="description"
                        name="description"
                        type="text"
                        placeholder="Short description (optional)"
                        defaultValue={initial?.description ?? ""}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <Label htmlFor="price">Price</Label>
                    <Input
                        id="price"
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="0.00"
                        defaultValue={
                            initial?.price != null ? String(initial.price) : ""
                        }
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <Label>Active</Label>
                    <input
                        type="hidden"
                        name="isActive"
                        value={isActive}
                    />
                    <Select
                        value={isActive}
                        onValueChange={(v) => setIsActive(v as "true" | "false")}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="true">Active</SelectItem>
                            <SelectItem value="false">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                        When inactive, the package won’t be selectable.
                    </p>
                </div>
            </div>

            <div className="flex gap-2">
                <Button type="submit">
                    {mode === "edit" ? "Update package" : "Create package"}
                </Button>
                <Button type="button" variant="outline" asChild>
                    <Link href="/packages">Cancel</Link>
                </Button>
            </div>
        </form>
    );
}

