import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockFindUnique = vi.fn();
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
        },
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import { resendBookingConfirmationAsAdmin } from "@/app/(app)/email-logs/actions";

describe("resendBookingConfirmationAsAdmin", () => {
    const bookingId = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("requires admin", async () => {
        mockAuth.mockResolvedValue({
            user: { role: "TEACHER", id: "t1" },
        });
        const r = await resendBookingConfirmationAsAdmin(
            bookingId,
            "a@b.com",
        );
        expect(r.success).toBe(false);
        expect(mockFindUnique).not.toHaveBeenCalled();
    });

    it("rejects email mismatch", async () => {
        mockAuth.mockResolvedValue({
            user: { role: "ADMIN", id: "admin1" },
        });
        mockFindUnique.mockResolvedValue({
            id: bookingId,
            status: "CONFIRMED",
            studentEmail: "student@school.test",
            user: { email: "fallback@example.com" },
        });

        const r = await resendBookingConfirmationAsAdmin(
            bookingId,
            "other@example.com",
        );
        expect(r.success).toBe(false);
        if (!r.success) {
            expect(r.error).toContain("does not match");
        }
        expect(mockDispatch).not.toHaveBeenCalled();
    });

    it("dispatches when recipient matches studentEmail", async () => {
        mockAuth.mockResolvedValue({
            user: { role: "ADMIN", id: "admin1" },
        });
        mockFindUnique.mockResolvedValue({
            id: bookingId,
            status: "CONFIRMED",
            studentEmail: "student@school.test",
            user: { email: "fallback@example.com" },
        });

        const r = await resendBookingConfirmationAsAdmin(
            bookingId,
            "student@school.test",
        );
        expect(r).toEqual({ success: true });
        expect(mockDispatch).toHaveBeenCalledWith(bookingId, {
            trigger: "ADMIN_RESEND",
            triggeredByUserId: "admin1",
        });
    });

    it("rejects non-confirmed booking", async () => {
        mockAuth.mockResolvedValue({
            user: { role: "ADMIN", id: "admin1" },
        });
        mockFindUnique.mockResolvedValue({
            id: bookingId,
            status: "PENDING",
            studentEmail: null,
            user: { email: "u@example.com" },
        });

        const r = await resendBookingConfirmationAsAdmin(
            bookingId,
            "u@example.com",
        );
        expect(r.success).toBe(false);
        expect(mockDispatch).not.toHaveBeenCalled();
    });
});
