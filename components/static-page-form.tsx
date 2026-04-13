"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

function slugify(title: string): string {
    return title
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

export type StaticPageFormProps = {
    initial?: {
        id: string;
        title: string;
        slug: string;
        content: string;
        isActive: boolean;
    } | null;
    formAction: (formData: FormData) => void;
};

export function StaticPageForm({ initial, formAction }: StaticPageFormProps) {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    const [title, setTitle] = React.useState(initial?.title ?? "");
    const [isActive, setIsActive] = React.useState(initial?.isActive ?? true);

    const slugPreview = slugify(title);

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {initial ? "Edit static page" : "Create static page"}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form action={formAction} className="flex flex-col gap-4">
                    {error ? (
                        <div
                            role="alert"
                            className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                        >
                            {error}
                        </div>
                    ) : null}

                    {initial ? (
                        <input type="hidden" name="id" value={initial.id} />
                    ) : null}

                    <input
                        type="hidden"
                        name="isActive"
                        value={isActive ? "on" : "off"}
                    />

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            name="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                        <p className="text-sm text-muted-foreground">
                            URL: /{slugPreview || "…"}
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="content">Content</Label>
                        <textarea
                            id="content"
                            name="content"
                            rows={12}
                            defaultValue={initial?.content ?? ""}
                            required
                            className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                            <Label
                                htmlFor="isActive"
                                className="cursor-pointer"
                            >
                                Active
                            </Label>
                            <Switch
                                id="isActive"
                                checked={isActive}
                                onCheckedChange={setIsActive}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button type="submit">
                            {initial ? "Save changes" : "Create page"}
                        </Button>
                        <Button type="button" variant="outline" asChild>
                            <Link href="/pages">Cancel</Link>
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
