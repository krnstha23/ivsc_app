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

export function UsersFilter({
    defaultName,
    defaultUsername,
    defaultIsActive,
    defaultRole,
}: {
    defaultName: string;
    defaultUsername: string;
    defaultIsActive: string;
    defaultRole: string;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [name, setName] = useState(defaultName);
    const [username, setUsername] = useState(defaultUsername);
    const [isActive, setIsActive] = useState(defaultIsActive || "all");
    const [role, setRole] = useState(defaultRole || "all");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );

    useEffect(() => {
        setName(defaultName);
        setUsername(defaultUsername);
        setIsActive(defaultIsActive || "all");
        setRole(defaultRole || "all");
    }, [defaultName, defaultUsername, defaultIsActive, defaultRole]);

    const applyToUrl = useCallback(
        (filters: {
            name: string;
            username: string;
            isActive: string;
            role: string;
        }) => {
            const params = new URLSearchParams();
            if (filters.name.trim()) params.set("name", filters.name.trim());
            if (filters.username.trim())
                params.set("username", filters.username.trim());
            if (filters.isActive && filters.isActive !== "all")
                params.set("isActive", filters.isActive);
            if (filters.role && filters.role !== "all")
                params.set("role", filters.role);

            startTransition(() => {
                router.push(
                    `/users${params.toString() ? `?${params.toString()}` : ""}`,
                );
            });
        },
        [router],
    );

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (usernameDebounceRef.current)
                clearTimeout(usernameDebounceRef.current);
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
                applyToUrl({ name: value, username, isActive, role });
            }, DEBOUNCE_MS);
        } else if (value.trim().length === 0) {
            debounceRef.current = setTimeout(() => {
                debounceRef.current = null;
                applyToUrl({ name: "", username, isActive, role });
            }, DEBOUNCE_MS);
        }
    }

    function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setUsername(value);

        if (usernameDebounceRef.current) {
            clearTimeout(usernameDebounceRef.current);
            usernameDebounceRef.current = null;
        }

        if (value.trim().length >= MIN_NAME_LENGTH_TO_AUTO_FILTER) {
            usernameDebounceRef.current = setTimeout(() => {
                usernameDebounceRef.current = null;
                applyToUrl({ name, username: value, isActive, role });
            }, DEBOUNCE_MS);
        } else if (value.trim().length === 0) {
            usernameDebounceRef.current = setTimeout(() => {
                usernameDebounceRef.current = null;
                applyToUrl({ name, username: "", isActive, role });
            }, DEBOUNCE_MS);
        }
    }

    function handleIsActiveChange(value: string) {
        setIsActive(value);
        applyToUrl({ name, username, isActive: value, role });
    }

    function handleRoleChange(value: string) {
        setRole(value);
        applyToUrl({ name, username, isActive, role: value });
    }

    function handleReset() {
        setName("");
        setUsername("");
        setIsActive("all");
        setRole("all");
        startTransition(() => {
            router.push("/users");
        });
    }

    return (
        <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
            <div className="flex flex-col gap-2">
                <Label htmlFor="filter-name">Name</Label>
                <Input
                    id="filter-name"
                    name="name"
                    type="text"
                    placeholder="Search by name..."
                    value={name}
                    onChange={handleNameChange}
                    className="w-48 md:w-56"
                />
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="filter-username">Username</Label>
                <Input
                    id="filter-username"
                    name="username"
                    type="text"
                    placeholder="Search by username..."
                    value={username}
                    onChange={handleUsernameChange}
                    className="w-40 md:w-48"
                />
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="filter-isActive">Active status</Label>
                <Select value={isActive} onValueChange={handleIsActiveChange}>
                    <SelectTrigger id="filter-isActive" className="w-36">
                        <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="filter-role">User type</Label>
                <Select value={role} onValueChange={handleRoleChange}>
                    <SelectTrigger id="filter-role" className="w-36">
                        <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="TEACHER">Teacher</SelectItem>
                        <SelectItem value="USER">Student</SelectItem>
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
