"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
    toggleTeacherActive,
    approveTeacherFromManage,
} from "@/app/(app)/teachers/actions";

export function TeacherToggleActiveButton({
    teacherId,
    isActive,
}: {
    teacherId: string;
    isActive: boolean;
}) {
    const [isPending, startTransition] = useTransition();

    return (
        <Button
            variant={isActive ? "outline" : "default"}
            size="xs"
            disabled={isPending}
            onClick={() => {
                startTransition(async () => {
                    await toggleTeacherActive(teacherId);
                });
            }}
        >
            {isPending ? "..." : isActive ? "Deactivate" : "Activate"}
        </Button>
    );
}

export function TeacherApproveButton({ userId }: { userId: string }) {
    const [isPending, startTransition] = useTransition();

    return (
        <Button
            variant="default"
            size="xs"
            disabled={isPending}
            onClick={() => {
                startTransition(async () => {
                    await approveTeacherFromManage(userId);
                });
            }}
        >
            {isPending ? "..." : "Approve"}
        </Button>
    );
}
