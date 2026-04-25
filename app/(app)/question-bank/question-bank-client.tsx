"use client";

import { useState, useTransition } from "react";
import {
    DocumentText,
    TrashBinTrash,
    CloudUpload,
    Eye,
} from "@solar-icons/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    uploadQuestion,
    toggleQuestionActive,
    deleteQuestion,
} from "./actions";

type Question = {
    id: string;
    title: string;
    description: string | null;
    fileName: string;
    fileSize: number;
    isActive: boolean;
    createdAt: Date;
    uploader: { firstName: string; lastName: string; role: string };
    _count: { bookings: number };
};

function formatFileSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function QuestionBankClient({ questions }: { questions: Question[] }) {
    const [uploadPending, startUpload] = useTransition();
    const [uploadError, setUploadError] = useState("");
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
    const [deleteError, setDeleteError] = useState("");
    const [deletePending, startDelete] = useTransition();
    const [toggling, startToggle] = useTransition();

    return (
        <div className="flex flex-col gap-6">
            {/* Upload form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CloudUpload size={20} />
                        Upload Question
                    </CardTitle>
                    <CardDescription>Add a new IELTS writing question PDF to the bank.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            setUploadError("");
                            setUploadSuccess(false);
                            const fd = new FormData(e.currentTarget);
                            startUpload(async () => {
                                const result = await uploadQuestion(fd);
                                if (result.success) {
                                    setUploadSuccess(true);
                                    (e.target as HTMLFormElement).reset();
                                } else {
                                    setUploadError(result.error);
                                }
                            });
                        }}
                        className="flex flex-col gap-4"
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                                <Input
                                    id="title"
                                    name="title"
                                    placeholder="e.g. Task 2 — Opinion Essay (Apr 2026)"
                                    required
                                    maxLength={200}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="description">Description (optional)</Label>
                                <Input
                                    id="description"
                                    name="description"
                                    placeholder="e.g. Academic, Task 2, Agree/Disagree"
                                    maxLength={300}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="qfile">PDF File <span className="text-destructive">*</span></Label>
                            <Input
                                id="qfile"
                                name="file"
                                type="file"
                                accept="application/pdf"
                                required
                            />
                            <p className="text-xs text-muted-foreground">PDF only · max 20 MB</p>
                        </div>
                        {uploadError && (
                            <p className="text-sm text-destructive">{uploadError}</p>
                        )}
                        {uploadSuccess && (
                            <p className="text-sm text-green-600 dark:text-green-400">
                                Question uploaded successfully.
                            </p>
                        )}
                        <Button type="submit" disabled={uploadPending} className="w-fit">
                            <CloudUpload size={16} />
                            {uploadPending ? "Uploading…" : "Upload Question"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Question list */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DocumentText size={20} />
                        All Questions
                    </CardTitle>
                    <CardDescription>
                        {questions.length} question{questions.length !== 1 ? "s" : ""} in the bank
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {questions.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                            <DocumentText size={32} />
                            <p className="text-sm">No questions yet. Upload the first one above.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead className="hidden md:table-cell">Uploaded by</TableHead>
                                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                                    <TableHead className="text-center">Used</TableHead>
                                    <TableHead className="text-center">Active</TableHead>
                                    <TableHead className="w-24" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {questions.map((q) => (
                                    <TableRow key={q.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{q.title}</p>
                                                {q.description && (
                                                    <p className="text-xs text-muted-foreground">{q.description}</p>
                                                )}
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {q.fileName} · {formatFileSize(q.fileSize)}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <span className="text-sm">
                                                {q.uploader.firstName} {q.uploader.lastName}
                                            </span>
                                            <Badge variant="outline" className="ml-2 text-xs capitalize">
                                                {q.uploader.role.toLowerCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                                            {new Date(q.createdAt).toLocaleDateString(undefined, {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary">{q._count.bookings}×</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Switch
                                                checked={q.isActive}
                                                disabled={toggling}
                                                onCheckedChange={() => {
                                                    startToggle(async () => {
                                                        await toggleQuestionActive(q.id);
                                                    });
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <a
                                                    href={`/api/questions/${q.id}/view`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <Button variant="ghost" size="icon">
                                                        <Eye size={16} />
                                                    </Button>
                                                </a>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    disabled={q._count.bookings > 0}
                                                    onClick={() => {
                                                        setDeleteError("");
                                                        setDeleteTarget(q);
                                                    }}
                                                >
                                                    <TrashBinTrash size={16} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Delete confirmation dialog */}
            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete question?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete{" "}
                            <span className="font-medium text-foreground">
                                {deleteTarget?.title}
                            </span>{" "}
                            and its PDF file. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {deleteError && (
                        <p className="px-6 text-sm text-destructive">{deleteError}</p>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deletePending}
                            onClick={(e) => {
                                e.preventDefault();
                                if (!deleteTarget) return;
                                startDelete(async () => {
                                    const result = await deleteQuestion(deleteTarget.id);
                                    if (result.success) {
                                        setDeleteTarget(null);
                                    } else {
                                        setDeleteError(result.error);
                                    }
                                });
                            }}
                        >
                            {deletePending ? "Deleting…" : "Yes, delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
