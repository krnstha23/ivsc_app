import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const role = (session.user as { role?: string }).role
  if (role === "ADMIN") redirect("/admin")
  if (role === "TEACHER") redirect("/teacher")
  if (role === "USER") redirect("/student")

  redirect("/login")
}
