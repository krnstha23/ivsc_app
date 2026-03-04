import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SectionCards } from "@/components/section-cards"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SectionCards />
    </div>
  )
}
