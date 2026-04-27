"use client";

import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Button } from "@/components/ui/button";

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function normalizeInitialContent(input: string): string {
    const value = input.trim();
    if (!value) return "<p></p>";

    // Keep existing rich content if already HTML-like.
    if (/<[a-z][\s\S]*>/i.test(value)) {
        return value;
    }

    const paragraphs = value
        .split(/\n{2,}/)
        .map((chunk) => `<p>${escapeHtml(chunk).replace(/\n/g, "<br/>")}</p>`)
        .join("");
    return paragraphs || "<p></p>";
}

export type TiptapEditorProps = {
    initialContent: string;
    onChange: (html: string, plainText: string) => void;
    disabled?: boolean;
};

export function TiptapEditor({
    initialContent,
    onChange,
    disabled = false,
}: TiptapEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [2, 3],
                },
            }),
            Link.configure({
                openOnClick: false,
                autolink: true,
                protocols: ["http", "https", "mailto"],
                defaultProtocol: "https",
            }),
        ],
        content: normalizeInitialContent(initialContent),
        editable: !disabled,
        immediatelyRender: false,
        onUpdate({ editor: activeEditor }) {
            onChange(activeEditor.getHTML(), activeEditor.getText());
        },
    });

    React.useEffect(() => {
        if (!editor) return;
        editor.setEditable(!disabled);
    }, [disabled, editor]);

    if (!editor) {
        return (
            <div className="min-h-[220px] rounded-md border border-input bg-background p-3 text-sm text-muted-foreground">
                Loading editor...
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={disabled || !editor.can().chain().focus().undo().run()}
                >
                    Undo
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={disabled || !editor.can().chain().focus().redo().run()}
                >
                    Redo
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive("heading", { level: 2 }) ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 2 }).run()
                    }
                    disabled={disabled}
                >
                    H2
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive("heading", { level: 3 }) ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 3 }).run()
                    }
                    disabled={disabled}
                >
                    H3
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive("bold") ? "default" : "outline"}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={disabled}
                >
                    Bold
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive("italic") ? "default" : "outline"}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={disabled}
                >
                    Italic
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive("bulletList") ? "default" : "outline"}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    disabled={disabled}
                >
                    Bullet List
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive("orderedList") ? "default" : "outline"}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    disabled={disabled}
                >
                    Numbered List
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive("blockquote") ? "default" : "outline"}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    disabled={disabled}
                >
                    Quote
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive("codeBlock") ? "default" : "outline"}
                    size="sm"
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    disabled={disabled}
                >
                    Code Block
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        editor.chain().focus().setHorizontalRule().run()
                    }
                    disabled={disabled}
                >
                    Divider
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive("link") ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                        const previousUrl = editor.getAttributes("link").href as
                            | string
                            | undefined;
                        const url = window.prompt(
                            "Enter URL (https://...)",
                            previousUrl ?? "https://",
                        );
                        if (url === null) return;
                        const normalized = url.trim();
                        if (!normalized) {
                            editor.chain().focus().unsetLink().run();
                            return;
                        }
                        editor
                            .chain()
                            .focus()
                            .extendMarkRange("link")
                            .setLink({ href: normalized })
                            .run();
                    }}
                    disabled={disabled}
                >
                    Link
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .clearNodes()
                            .unsetAllMarks()
                            .run()
                    }
                    disabled={disabled}
                >
                    Clear Format
                </Button>
            </div>
            <EditorContent
                editor={editor}
                className="min-h-[260px] rounded-md border border-input bg-background p-3 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 [&_.ProseMirror]:min-h-[220px] [&_.ProseMirror]:outline-none"
            />
        </div>
    );
}
