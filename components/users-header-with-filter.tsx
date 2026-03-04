"use client"

import Link from "next/link"
import { useState } from "react"
import { Filter, Maximize } from "@solar-icons/react"
import { Button } from "@/components/ui/button"
import { UsersFilter } from "@/components/users-filter"

export function UsersHeaderWithFilter({
  defaultName,
  defaultUsername,
  defaultIsActive,
  defaultRole,
}: {
  defaultName: string
  defaultUsername: string
  defaultIsActive: string
  defaultRole: string
}) {
  const [showFilter, setShowFilter] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and filter all users in the system.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" size="sm" asChild>
            <Link href="/users/new">
              <Maximize size={16} className="mr-1.5 size-4" />
              Create
            </Link>
          </Button>
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
        <UsersFilter
          defaultName={defaultName}
          defaultUsername={defaultUsername}
          defaultIsActive={defaultIsActive}
          defaultRole={defaultRole}
        />
      )}
    </div>
  )
}
