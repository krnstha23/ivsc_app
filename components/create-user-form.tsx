"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
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
import { Toggle } from "@/components/ui/toggle";
import { createUser } from "@/app/(app)/users/actions";

type Role = "ADMIN" | "TEACHER" | "USER";

export function CreateUserForm() {
    const [role, setRole] = useState<Role>("USER");
    const [isActive, setIsActive] = useState(true);
    const [, formAction] = useActionState(
        async (_: unknown, formData: FormData) => {
            await createUser(formData);
        },
        null
    );

    return (
        <form
            action={formAction}
            className="flex w-full flex-col gap-6 rounded-lg border bg-card p-6 shadow-sm"
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        placeholder="First name"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="middleName">Middle name</Label>
                    <Input
                        id="middleName"
                        name="middleName"
                        type="text"
                        placeholder="Middle name (optional)"
                    />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                        id="lastName"
                        name="lastName"
                        type="text"
                        required
                        placeholder="Last name"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                        id="username"
                        name="username"
                        type="text"
                        required
                        placeholder="Username"
                        autoComplete="username"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="Email"
                        autoComplete="email"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        required
                        placeholder="Password"
                        autoComplete="new-password"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="Phone (optional)"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="role">User type</Label>
                    <input type="hidden" name="role" value={role} />
                    <Select
                        value={role}
                        onValueChange={(v) => setRole(v as Role)}
                    >
                        <SelectTrigger id="role">
                            <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="USER">Student</SelectItem>
                            <SelectItem value="TEACHER">Teacher</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label>Active</Label>
                    <input
                        type="hidden"
                        name="isActive"
                        value={isActive ? "on" : "off"}
                    />
                    <Toggle
                        type="button"
                        variant="outline"
                        size="default"
                        pressed={isActive}
                        onPressedChange={setIsActive}
                        aria-label={isActive ? "Active" : "Inactive"}
                        className="w-fit"
                    >
                        {isActive ? "Active" : "Inactive"}
                    </Toggle>
                    <p className="text-sm text-muted-foreground">
                        When active, the user can sign in.
                    </p>
                </div>
            </div>
            <div className="flex gap-2">
                <Button type="submit">Create user</Button>
                <Button type="button" variant="outline" asChild>
                    <Link href="/users">Cancel</Link>
                </Button>
            </div>
        </form>
    );
}
