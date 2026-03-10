"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { AddCircle } from "@solar-icons/react";
import { Button } from "@/components/ui/button";

export function PackagesHeaderWithFilter() {
    const { data: session } = useSession();
    const role = (session?.user as { role?: string } | undefined)?.role;
    const canCreate = role === "ADMIN";

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-semibold">Packages</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        View all packages in the system.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {canCreate && (
                        <Button size="sm" asChild>
                            <Link href="/packages/new">
                                <AddCircle size={16} className="mr-1.5 size-4" />
                                Create package
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
