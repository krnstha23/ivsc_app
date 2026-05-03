"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";

import {
    createPackageBundle,
    updatePackageBundleDetails,
} from "@/app/(app)/packages/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PackageOption = { id: string; name: string; isActive: boolean };

function summarizeSelected(packages: PackageOption[], selectedIds: string[]) {
    const selected = packages.filter((p) => selectedIds.includes(p.id));
    if (selected.length === 0) return "Select packages";
    if (selected.length === 1) return selected[0]?.name ?? "1 selected";
    return `${selected.length} selected`;
}

export function CreateBundleForm({
    packages,
    mode = "create",
    initial,
}: {
    packages: PackageOption[];
    mode?: "create" | "edit";
    initial?: {
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
        isFeatured?: boolean;
        showOnLanding?: boolean;
        packageIds: string[];
    };
}) {
    const [isActive, setIsActive] = React.useState<"true" | "false">(
        initial?.isActive === false ? "false" : "true",
    );
    const [isFeatured, setIsFeatured] = React.useState(
        initial?.isFeatured ?? false,
    );
    const [showOnLanding, setShowOnLanding] = React.useState(
        initial?.showOnLanding ?? false,
    );
    const [hasEvaluation, setHasEvaluation] = React.useState(
        initial?.hasEvaluation ?? false,
    );
    const [selectedIds, setSelectedIds] = React.useState<string[]>(
        initial?.packageIds ?? [],
    );
    const [durationValue, setDurationValue] = React.useState(
        initial?.duration != null ? String(initial.duration) : "",
    );

    const [, formAction] = useActionState(
        async (_: unknown, formData: FormData) => {
            if (mode === "edit") {
                await updatePackageBundleDetails(formData);
            } else {
                await createPackageBundle(formData);
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
                <input type="hidden" name="bundleId" value={initial?.id ?? ""} />
            )}
            <input type="hidden" name="hasEvaluation" value={String(hasEvaluation)} />
            <input
                type="hidden"
                name="isFeatured"
                value={isFeatured ? "true" : "false"}
            />
            <input
                type="hidden"
                name="showOnLanding"
                value={showOnLanding ? "true" : "false"}
            />

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="name">Bundle name</Label>
                    <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        placeholder="e.g. IELTS Full Mock"
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
                    <Label htmlFor="duration">Session duration (minutes)</Label>
                    <Input
                        id="duration"
                        name="duration"
                        type="number"
                        min="0"
                        max="480"
                        step="5"
                        required
                        placeholder="e.g. 30"
                        value={durationValue}
                        onChange={(e) => setDurationValue(e.target.value)}
                    />
                    {durationValue === "0" && (
                        <p className="text-sm text-muted-foreground">
                            Writing-only bundle (no speaking session)
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <Label htmlFor="discountPercent">Discount (%)</Label>
                    <Input
                        id="discountPercent"
                        name="discountPercent"
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        placeholder="Optional"
                        defaultValue={
                            initial?.discountPercent != null
                                ? String(initial.discountPercent)
                                : ""
                        }
                    />
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                    <p className="text-sm font-medium text-foreground">
                        Bundle price by lead-time tier
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Standard (&ge;48h), Priority (24&ndash;48h), Instant
                        (same day).
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    <Label htmlFor="priceStandard">Standard price</Label>
                    <Input
                        id="priceStandard"
                        name="priceStandard"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="0.00"
                        defaultValue={
                            initial?.priceStandard != null
                                ? String(initial.priceStandard)
                                : ""
                        }
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <Label htmlFor="pricePriority">Priority price</Label>
                    <Input
                        id="pricePriority"
                        name="pricePriority"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="0.00"
                        defaultValue={
                            initial?.pricePriority != null
                                ? String(initial.pricePriority)
                                : ""
                        }
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <Label htmlFor="priceInstant">Instant price</Label>
                    <Input
                        id="priceInstant"
                        name="priceInstant"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="0.00"
                        defaultValue={
                            initial?.priceInstant != null
                                ? String(initial.priceInstant)
                                : ""
                        }
                    />
                </div>

                <div className="flex items-center gap-3">
                    <Switch
                        id="hasEvaluation"
                        checked={hasEvaluation}
                        onCheckedChange={setHasEvaluation}
                    />
                    <Label htmlFor="hasEvaluation" className="cursor-pointer">
                        Includes evaluation
                    </Label>
                </div>

                <div className="flex flex-col gap-2">
                    <Label>Status</Label>
                    <input type="hidden" name="isActive" value={isActive} />
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
                </div>

                <div className="flex items-center gap-3">
                    <Switch
                        id="isFeatured"
                        checked={isFeatured}
                        onCheckedChange={setIsFeatured}
                    />
                    <Label htmlFor="isFeatured" className="cursor-pointer">
                        Featured bundle
                    </Label>
                </div>

                <div className="flex items-center gap-3 sm:col-span-2">
                    <Switch
                        id="showOnLanding"
                        checked={showOnLanding}
                        onCheckedChange={setShowOnLanding}
                    />
                    <Label htmlFor="showOnLanding" className="cursor-pointer">
                        Show on home page pricing
                    </Label>
                </div>

                <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label>Packages</Label>
                    {selectedIds.map((id) => (
                        <input key={id} type="hidden" name="packageIds" value={id} />
                    ))}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-fit">
                                {summarizeSelected(packages, selectedIds)}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-80">
                            <DropdownMenuLabel>Packages</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {packages.map((p) => {
                                const checked = selectedIds.includes(p.id);
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={p.id}
                                        checked={checked}
                                        onCheckedChange={(nextChecked) => {
                                            setSelectedIds((prev) => {
                                                if (nextChecked) {
                                                    return prev.includes(p.id)
                                                        ? prev
                                                        : [...prev, p.id];
                                                }
                                                return prev.filter((x) => x !== p.id);
                                            });
                                        }}
                                    >
                                        <span
                                            className={
                                                p.isActive
                                                    ? ""
                                                    : "text-muted-foreground"
                                            }
                                        >
                                            {p.name}
                                            {!p.isActive ? " (inactive)" : ""}
                                        </span>
                                    </DropdownMenuCheckboxItem>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <p className="text-sm text-muted-foreground">
                        Select one or more packages included in this bundle.
                    </p>
                </div>
            </div>

            <div className="flex gap-2">
                <Button type="submit">
                    {mode === "edit" ? "Update bundle" : "Create bundle"}
                </Button>
                <Button type="button" variant="outline" asChild>
                    <Link href="/packages">Cancel</Link>
                </Button>
            </div>
        </form>
    );
}
