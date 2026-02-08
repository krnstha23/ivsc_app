import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function StudentDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-semibold">Student Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Welcome, {session.user.name ?? session.user.email}.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Browse teachers and manage bookings here.
      </p>
    </div>
  )
}
