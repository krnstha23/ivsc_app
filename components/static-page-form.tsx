"use client";

import * as React from "react";
import { useTransition } from "react";
import dynamic from "next/dynamic";
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

const TiptapEditor = dynamic(
    () => import("@/components/tiptap-editor").then((mod) => mod.TiptapEditor),
    { ssr: false },
);

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
    const [contentHtml, setContentHtml] = React.useState(initial?.content ?? "");
    const [contentText, setContentText] = React.useState("");
    const formRef = React.useRef<HTMLFormElement>(null);

    const slugPreview = slugify(title);
    const isEdit = !!initial;

    React.useEffect(() => {
        const source = initial?.content ?? "";
        const plain = source.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        setContentText(plain);
    }, [initial?.content]);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!contentText.trim()) {
            toast.error("Content is required.");
            return;
        }
        const fd = new FormData(e.currentTarget);
        fd.set("content", contentHtml);
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
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="slugPreview">URL</Label>
                        <Input
                            id="slugPreview"
                            value={`/${slugPreview || "..."}`}
                            disabled
                            readOnly
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="content">Content</Label>
                        <input
                            type="hidden"
                            id="content"
                            name="content"
                            value={contentHtml}
                            readOnly
                        />
                        <TiptapEditor
                            initialContent={initial?.content ?? ""}
                            disabled={pending}
                            onChange={(html, plainText) => {
                                setContentHtml(html);
                                setContentText(plainText);
                            }}
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
