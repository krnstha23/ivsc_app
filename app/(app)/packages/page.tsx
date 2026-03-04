import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PackagesHeaderWithFilter } from "@/components/packages-header-with-filter"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

type SearchParams = { name?: string; isActive?: string }

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { name, isActive } = await searchParams

  const where: Parameters<typeof prisma.package.findMany>[0]["where"] = {}

  if (name?.trim()) {
    where.name = {
      contains: name.trim(),
      mode: "insensitive",
    }
  }

  if (isActive === "true") where.isActive = true
  else if (isActive === "false") where.isActive = false

  const packages = await prisma.package.findMany({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      subjects: true,
      isActive: true,
    },
    orderBy: [{ name: "asc" }],
  })

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <PackagesHeaderWithFilter
          defaultName={name ?? ""}
          defaultIsActive={isActive ?? ""}
        />
      </div>

      <div className="px-4 lg:px-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No packages found.
                  </TableCell>
                </TableRow>
              ) : (
                packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium">{pkg.name}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {pkg.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      ${Number(pkg.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {pkg.subjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {pkg.subjects.map((s) => (
                            <Badge key={s} variant="outline" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          pkg.isActive
                            ? "text-green-600 dark:text-green-400 font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {pkg.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
