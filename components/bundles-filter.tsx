"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState, useEffect, useRef, useCallback } from "react";
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

const DEBOUNCE_MS = 400;
const MIN_NAME_LENGTH_TO_AUTO_FILTER = 3;

export function BundlesFilter({
    defaultName,
    defaultIsActive,
}: {
    defaultName: string;
    defaultIsActive: string;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [name, setName] = useState(defaultName);
    const [isActive, setIsActive] = useState(defaultIsActive || "all");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setName(defaultName);
        setIsActive(defaultIsActive || "all");
    }, [defaultName, defaultIsActive]);

    const applyToUrl = useCallback(
        (filters: { name: string; isActive: string }) => {
            const params = new URLSearchParams();
            if (filters.name.trim()) params.set("bundleName", filters.name.trim());
            if (filters.isActive && filters.isActive !== "all")
                params.set("bundleIsActive", filters.isActive);

            startTransition(() => {
                router.push(
                    `/packages${params.toString() ? `?${params.toString()}` : ""}`,
                );
            });
        },
        [router],
    );

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setName(value);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }

        if (value.trim().length >= MIN_NAME_LENGTH_TO_AUTO_FILTER) {
            debounceRef.current = setTimeout(() => {
                debounceRef.current = null;
                applyToUrl({ name: value, isActive });
            }, DEBOUNCE_MS);
        } else if (value.trim().length === 0) {
            debounceRef.current = setTimeout(() => {
                debounceRef.current = null;
                applyToUrl({ name: "", isActive });
            }, DEBOUNCE_MS);
        }
    }

    function handleIsActiveChange(value: string) {
        setIsActive(value);
        applyToUrl({ name, isActive: value });
    }

    function handleReset() {
        setName("");
        setIsActive("all");
        startTransition(() => {
            router.push("/packages");
        });
    }

    return (
        <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
            <div className="flex flex-col gap-2">
                <Label htmlFor="bundle-filter-name">Name</Label>
                <Input
                    id="bundle-filter-name"
                    name="bundleName"
                    type="text"
                    placeholder="Search bundles..."
                    value={name}
                    onChange={handleNameChange}
                    className="w-48 md:w-56"
                />
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="bundle-filter-isActive">Status</Label>
                <Select value={isActive} onValueChange={handleIsActiveChange}>
                    <SelectTrigger id="bundle-filter-isActive" className="w-36">
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
                onClick={handleReset}
                disabled={isPending}
            >
                Reset
            </Button>
        </div>
    );
}

