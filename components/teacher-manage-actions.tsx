"use client";

import { useTransition } from "react";
import { CheckCircle, CloseCircle } from "@solar-icons/react";
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
            size="icon"
            disabled={isPending}
            aria-label={isActive ? "Deactivate teacher" : "Activate teacher"}
            onClick={() => {
                startTransition(async () => {
                    await toggleTeacherActive(teacherId);
                });
            }}
        >
            {isPending ? (
                <span className="text-xs">...</span>
            ) : isActive ? (
                <CloseCircle size={16} />
            ) : (
                <CheckCircle size={16} />
            )}
        </Button>
    );
}

export function TeacherApproveButton({ userId }: { userId: string }) {
    const [isPending, startTransition] = useTransition();

    return (
        <Button
            variant="default"
            size="icon"
            disabled={isPending}
            aria-label="Approve teacher"
            onClick={() => {
                startTransition(async () => {
                    await approveTeacherFromManage(userId);
                });
            }}
        >
            {isPending ? <span className="text-xs">...</span> : <CheckCircle size={16} />}
        </Button>
    );
}
