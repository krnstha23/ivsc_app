import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Calendar } from "@/components/calendar";

export default async function StudentsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-xl font-semibold">Students</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and navigate dates. Events and sessions can be added later.
        </p>
      </div>
      <div className="px-4 lg:px-6">
        <Calendar />
      </div>
    </div>
  );
}
