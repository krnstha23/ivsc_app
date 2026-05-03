import { permanentRedirect } from "next/navigation";

export default function TeachingBookingsRedirect() {
    permanentRedirect("/bookings");
}
