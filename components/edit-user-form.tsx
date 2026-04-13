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
import { updateUser } from "@/app/(app)/users/actions";

type Role = "ADMIN" | "TEACHER" | "USER";

export function EditUserForm({
    user,
    error,
}: {
    user: {
        id: string;
        userName: string;
        email: string;
        firstName: string;
        middleName: string | null;
        lastName: string;
        phone: string | null;
        role: Role;
        isActive: boolean;
    };
    error?: string;
}) {
    const [role, setRole] = useState<Role>(user.role);
    const [isActive, setIsActive] = useState(user.isActive);
    const [, formAction] = useActionState(
        async (_: unknown, formData: FormData) => {
            await updateUser(formData);
        },
        null
    );

    return (
        <form
            action={formAction}
            className="flex w-full max-w-xl flex-col gap-6 rounded-lg border bg-card p-6 shadow-sm"
        >
            <input type="hidden" name="id" value={user.id} />
            {error ? (
                <p className="text-sm text-destructive" role="alert">
                    {error}
                </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label>Username</Label>
                    <p className="text-muted-foreground text-sm">{user.userName}</p>
                    <p className="text-muted-foreground text-xs">
                        Username cannot be changed.
                    </p>
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        defaultValue={user.firstName}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="middleName">Middle name</Label>
                    <Input
                        id="middleName"
                        name="middleName"
                        type="text"
                        defaultValue={user.middleName ?? ""}
                    />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                        id="lastName"
                        name="lastName"
                        type="text"
                        required
                        defaultValue={user.lastName}
                    />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        defaultValue={user.email}
                        autoComplete="email"
                    />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        defaultValue={user.phone ?? ""}
                    />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="newPassword">New password</Label>
                    <Input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Leave blank to keep current"
                    />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="edit-role">User type</Label>
                    <input type="hidden" name="role" value={role} />
                    <Select
                        value={role}
                        onValueChange={(v) => setRole(v as Role)}
                    >
                        <SelectTrigger id="edit-role">
                            <SelectValue />
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
                </div>
            </div>
            <div className="flex gap-2">
                <Button type="submit">Save</Button>
                <Button type="button" variant="outline" asChild>
                    <Link href="/users">Cancel</Link>
                </Button>
            </div>
        </form>
    );
}
