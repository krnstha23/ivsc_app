import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CalendarWithBookings } from "@/components/calendar-with-bookings";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-xl font-semibold">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View your confirmed bookings. Click a date to see the day&apos;s
          schedule.
        </p>
      </div>
      <div className="px-4 lg:px-6">
        <CalendarWithBookings />
      </div>
    </div>
  );
}
