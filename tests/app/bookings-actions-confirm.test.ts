import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockDispatch = vi.fn();

vi.mock("@/lib/auth", () => ({
    auth: () => mockAuth(),
}));

vi.mock("@/lib/dispatch-booking-confirmation-email", () => ({
    dispatchBookingConfirmationEmail: (...args: unknown[]) =>
        mockDispatch(...args),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        booking: {
            findUnique: (...a: unknown[]) => mockFindUnique(...a),
            update: (...a: unknown[]) => mockUpdate(...a),
        },
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import { confirmPendingBooking } from "@/app/(app)/bookings/actions";

describe("confirmPendingBooking", () => {
    const bookingId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects when not signed in", async () => {
        mockAuth.mockResolvedValue(null);
        const r = await confirmPendingBooking(bookingId);
        expect(r).toEqual({
            success: false,
            error: "You must be signed in.",
        });
        expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it("rejects when role is not ADMIN", async () => {
        mockAuth.mockResolvedValue({
            user: { role: "USER", id: "u1" },
        });
        const r = await confirmPendingBooking(bookingId);
        expect(r.success).toBe(false);
        expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it("rejects invalid uuid", async () => {
        mockAuth.mockResolvedValue({
            user: { role: "ADMIN", id: "admin1" },
        });
        const r = await confirmPendingBooking("not-a-uuid");
        expect(r).toEqual({ success: false, error: "Invalid booking." });
    });

    it("rejects when booking is not pending", async () => {
        mockAuth.mockResolvedValue({
            user: { role: "ADMIN", id: "admin1" },
        });
        mockFindUnique.mockResolvedValue({
            id: bookingId,
            status: "CONFIRMED",
        });
        const r = await confirmPendingBooking(bookingId);
        expect(r.success).toBe(false);
        expect(mockUpdate).not.toHaveBeenCalled();
        expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("confirms, dispatches email context, and succeeds", async () => {
        mockAuth.mockResolvedValue({
            user: { role: "ADMIN", id: "admin1" },
        });
        mockFindUnique.mockResolvedValue({
            id: bookingId,
            status: "PENDING",
        });
        mockUpdate.mockResolvedValue({});

        const r = await confirmPendingBooking(bookingId);

        expect(r).toEqual({ success: true });
        expect(mockUpdate).toHaveBeenCalledWith({
            where: { id: bookingId },
            data: { status: "CONFIRMED", paymentStatus: "PAID" },
        });
        expect(mockDispatch).toHaveBeenCalledWith(bookingId, {
            trigger: "BOOKING_CONFIRM",
            triggeredByUserId: "admin1",
        });
    });
});
