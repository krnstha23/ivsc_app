import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { canAccess } from "@/lib/permissions"

/**
 * Placeholder for dashboard sub-routes (e.g. /dashboard/analytics, /dashboard/bookings).
 * Replace with real pages as features are built.
 */
export default async function DashboardSubPage({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { slug } = await params
  const path = slug?.join("/") ?? ""

  const adminOnlyPaths = ["team", "projects", "data", "reports", "assistant"]
  const teacherPaths = ["lifecycle", "availability"]
  const userPaths = ["browse", "packages"]
  const role = (session.user as { role?: string }).role as
    | "ADMIN"
    | "TEACHER"
    | "USER"
    | undefined

  if (adminOnlyPaths.some((p) => path.startsWith(p)) && !canAccess(role, ["ADMIN"])) {
    redirect("/dashboard")
  }
  if (teacherPaths.some((p) => path.startsWith(p)) && !canAccess(role, ["ADMIN", "TEACHER"])) {
    redirect("/dashboard")
  }
  if (userPaths.some((p) => path.startsWith(p)) && !canAccess(role, ["ADMIN", "USER"])) {
    redirect("/dashboard")
  }

  const title = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, " ")

  return (
    <div className="flex flex-col gap-4 py-4 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This section is not built yet. You have access based on your role.
        </p>
      </div>
    </div>
  )
}
