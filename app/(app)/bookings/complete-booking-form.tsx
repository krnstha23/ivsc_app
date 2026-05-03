import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeBookingFromForm } from "./actions";

export function CompleteBookingForm({ bookingId }: { bookingId: string }) {
    return (
        <form
            action={async (formData) => {
                await completeBookingFromForm(formData);
            }}
        >
            <input type="hidden" name="bookingId" value={bookingId} />
            <Button type="submit" size="sm" variant="outline">
                <Check size={16} />
            </Button>
        </form>
    );
}
