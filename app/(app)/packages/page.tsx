import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import type { PackageBundleWhereInput } from "@/app/generated/prisma/models/PackageBundle"
import { PackagesHeaderWithFilter } from "@/components/packages-header-with-filter"
import { BundlesTable } from "@/components/bundles-table"
import { BundlesHeaderWithFilter } from "@/components/bundles-header-with-filter"
import { PackagesTable } from "@/components/packages-table"

type SearchParams = { bundleName?: string; bundleIsActive?: string }

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as { role?: string }).role
  if (role !== "ADMIN") redirect("/dashboard")
  const canManage = true

  const { bundleName, bundleIsActive } = await searchParams

  const packages = await prisma.package.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      isActive: true,
    },
    orderBy: [{ name: "asc" }],
  })
  const packagesForClient = packages.map((p) => ({
    ...p,
    price: Number(p.price),
  }))

  const bundleWhere: PackageBundleWhereInput = {}
  if (bundleName?.trim()) {
    bundleWhere.name = { contains: bundleName.trim(), mode: "insensitive" }
  }
  if (bundleIsActive === "true") bundleWhere.isActive = true
  else if (bundleIsActive === "false") bundleWhere.isActive = false

  const bundles = await prisma.packageBundle.findMany({
    where: bundleWhere,
    select: {
      id: true,
      name: true,
      priceStandard: true,
      pricePriority: true,
      priceInstant: true,
      duration: true,
      hasEvaluation: true,
      discountPercent: true,
      isActive: true,
      isFeatured: true,
      packageIds: true,
    },
    orderBy: [{ name: "asc" }],
  })

  const bundlesForClient = bundles.map((b) => ({
    ...b,
    priceStandard: Number(b.priceStandard),
    pricePriority: Number(b.pricePriority),
    priceInstant: Number(b.priceInstant),
    discountPercent:
      b.discountPercent == null ? null : Number(b.discountPercent),
  }))

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <PackagesHeaderWithFilter />
      </div>

      <div className="px-4 lg:px-6">
        <PackagesTable packages={packagesForClient} canManage={canManage} />
      </div>

      <div className="px-4 lg:px-6">
        <BundlesHeaderWithFilter
          defaultName={bundleName ?? ""}
          defaultIsActive={bundleIsActive ?? ""}
        />
      </div>

      <div className="px-4 lg:px-6">
        <BundlesTable
          bundles={bundlesForClient}
          canManage={canManage}
        />
      </div>
    </div>
  )
}
