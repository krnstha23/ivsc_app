"use client";

import { useState } from "react";
import { Filter } from "@solar-icons/react";
import { Button } from "@/components/ui/button";
import { PackagesFilter } from "@/components/packages-filter";

export function PackagesHeaderWithFilter({
    defaultName,
    defaultIsActive,
}: {
    defaultName: string;
    defaultIsActive: string;
}) {
    const [showFilter, setShowFilter] = useState(false);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-semibold">Packages</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        View and filter all packages in the system.
                    </p>
                </div>
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

            {showFilter && (
                <PackagesFilter
                    defaultName={defaultName}
                    defaultIsActive={defaultIsActive}
                />
            )}
        </div>
    );
}
