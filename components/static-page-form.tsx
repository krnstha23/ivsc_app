"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
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

type ActionResult = { success: true } | { success: false; error: string };

export type StaticPageFormProps = {
    initial?: {
        id: string;
        title: string;
        slug: string;
        content: string;
        isActive: boolean;
    } | null;
    formAction: (formData: FormData) => Promise<ActionResult>;
};

export function StaticPageForm({ initial, formAction }: StaticPageFormProps) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [title, setTitle] = React.useState(initial?.title ?? "");
    const [isActive, setIsActive] = React.useState(initial?.isActive ?? true);
    const formRef = React.useRef<HTMLFormElement>(null);

    const slugPreview = slugify(title);
    const isEdit = !!initial;

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
            const result = await formAction(fd);
            if (result.success) {
                toast.success(isEdit ? "Page updated." : "Page created.");
                router.push("/pages");
                router.refresh();
            } else {
                toast.error(result.error);
            }
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {isEdit ? "Edit static page" : "Create static page"}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form
                    ref={formRef}
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-4"
                >
                    {initial && (
                        <input type="hidden" name="id" value={initial.id} />
                    )}
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
                            disabled={pending}
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
                            disabled={pending}
                            className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                            <Label htmlFor="isActive" className="cursor-pointer">
                                Active
                            </Label>
                            <Switch
                                id="isActive"
                                checked={isActive}
                                onCheckedChange={setIsActive}
                                disabled={pending}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button type="submit" disabled={pending}>
                            {pending
                                ? isEdit
                                    ? "Saving…"
                                    : "Creating…"
                                : isEdit
                                  ? "Save changes"
                                  : "Create page"}
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
