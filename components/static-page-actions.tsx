"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle, CloseCircle, TrashBinTrash } from "@solar-icons/react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    deleteStaticPage,
    toggleStaticPageActive,
} from "@/app/(app)/pages/actions";

export function DeletePageButton({ id }: { id: string }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="destructive"
                    size="icon"
                    disabled={pending}
                    aria-label="Delete page"
                >
                    <TrashBinTrash size={16} />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete page</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure? This cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        onClick={() => {
                            startTransition(async () => {
                                const res = await deleteStaticPage(id);
                                if (res.success) {
                                    toast.success("Page deleted.");
                                    router.refresh();
                                } else {
                                    toast.error(
                                        res.error ?? "Failed to delete.",
                                    );
                                }
                            });
                        }}
                    >
                        {pending ? "Deleting…" : "Delete"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function ToggleActiveButton({
    id,
    isActive,
}: {
    id: string;
    isActive: boolean;
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const actionLabel = isActive ? "Deactivate" : "Activate";
    return (
        <Button
            variant="outline"
            size="sm"
            disabled={pending}
            aria-label={`${actionLabel} page`}
            onClick={() => {
                startTransition(async () => {
                    const res = await toggleStaticPageActive(id);
                    if (res.success) {
                        toast.success(
                            isActive
                                ? "Page deactivated."
                                : "Page activated.",
                        );
                        router.refresh();
                    } else {
                        toast.error(res.error ?? "Failed to toggle.");
                    }
                });
            }}
        >
            {pending ? (
                <span className="text-xs">...</span>
            ) : isActive ? (
                <span className="inline-flex items-center gap-1.5">
                    <CloseCircle size={16} />
                    {actionLabel}
                </span>
            ) : (
                <span className="inline-flex items-center gap-1.5">
                    <CheckCircle size={16} />
                    {actionLabel}
                </span>
            )}
        </Button>
    );
}
