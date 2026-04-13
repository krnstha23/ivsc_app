"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOwnProfile } from "@/app/(app)/profile/actions";

export type ProfileFormProps = {
    initial: {
        firstName: string;
        middleName: string | null;
        lastName: string;
        email: string;
        phone: string | null;
        bio: string | null;
    };
    showBio: boolean;
};

export function ProfileForm({ initial, showBio }: ProfileFormProps) {
    const [pending, setPending] = React.useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        setPending(true);
        const result = await updateOwnProfile({
            firstName: fd.get("firstName"),
            middleName: fd.get("middleName") || null,
            lastName: fd.get("lastName"),
            email: fd.get("email"),
            phone: fd.get("phone") || null,
            bio: showBio ? fd.get("bio") || null : null,
        });
        setPending(false);
        if (result.success) {
            toast.success("Profile saved.");
        } else {
            toast.error(result.error);
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="mx-auto max-w-xl space-y-6 rounded-lg border bg-card p-6 shadow-sm"
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                        id="firstName"
                        name="firstName"
                        defaultValue={initial.firstName}
                        required
                    />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="middleName">Middle name</Label>
                    <Input
                        id="middleName"
                        name="middleName"
                        defaultValue={initial.middleName ?? ""}
                    />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                        id="lastName"
                        name="lastName"
                        defaultValue={initial.lastName}
                        required
                    />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={initial.email}
                        required
                    />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                        id="phone"
                        name="phone"
                        defaultValue={initial.phone ?? ""}
                    />
                </div>
                {showBio ? (
                    <div className="flex flex-col gap-2 sm:col-span-2">
                        <Label htmlFor="bio">Bio</Label>
                        <textarea
                            id="bio"
                            name="bio"
                            rows={4}
                            defaultValue={initial.bio ?? ""}
                            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                ) : null}
            </div>
            <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
            </Button>
        </form>
    );
}
