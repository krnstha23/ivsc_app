"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AddCircle, Filter } from "@solar-icons/react";
import { Button } from "@/components/ui/button";
import { BundlesFilter } from "@/components/bundles-filter";

export function BundlesHeaderWithFilter({
    defaultName,
    defaultIsActive,
}: {
    defaultName: string;
    defaultIsActive: string;
}) {
    const [showFilter, setShowFilter] = useState(false);
    const { data: session } = useSession();
    const role = (session?.user as { role?: string } | undefined)?.role;
    const canCreate = role === "ADMIN";

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-lg font-semibold">Bundles</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Marketing bundles grouping multiple packages.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {canCreate && (
                        <Button size="sm" asChild>
                            <Link href="/packages/bundles/new">
                                <AddCircle size={16} className="mr-1.5 size-4" />
                                Create bundle
                            </Link>
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant={showFilter ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setShowFilter((v) => !v)}
                    >
                        {showFilter ? (
                            <>
                                <Filter size={16} className="mr-1.5 size-4" />
                                Hide filter
                            </>
                        ) : (
                            <>
                                <Filter size={16} className="mr-1.5 size-4" />
                                Filter
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {showFilter && (
                <BundlesFilter
                    defaultName={defaultName}
                    defaultIsActive={defaultIsActive}
                />
            )}
        </div>
    );
}

