import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockBookingFind = vi.fn();
const mockBookingDelete = vi.fn();
const mockTeacherFind = vi.fn();

vi.mock("@/lib/auth", () => ({
    auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        booking: {
            findUnique: (...a: unknown[]) => mockBookingFind(...a),
            delete: (...a: unknown[]) => mockBookingDelete(...a),
        },
        teacherProfile: {
            findUnique: (...a: unknown[]) => mockTeacherFind(...a),
        },
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import { cancelBooking } from "@/app/(app)/packages/actions";

const bid = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

describe("cancelBooking", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects when not signed in", async () => {
        mockAuth.mockResolvedValue(null);
        const r = await cancelBooking(bid);
        expect(r).toEqual({ success: false, error: "You must be signed in." });
    });

    it("rejects invalid booking id", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        const r = await cancelBooking("not-a-uuid");
        expect(r.success).toBe(false);
    });

    it("rejects when booking missing", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
        mockBookingFind.mockResolvedValue(null);
        const r = await cancelBooking(bid);
        expect(r).toEqual({ success: false, error: "Booking not found." });
    });

    it("rejects when already cancelled", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
        mockBookingFind.mockResolvedValue({
            id: bid,
            userId: "stu",
            teacherId: "t1",
            packageId: null,
            status: "CANCELLED",
        });
        const r = await cancelBooking(bid);
        expect(r).toEqual({
            success: false,
            error: "This booking is already cancelled.",
        });
    });

    it("blocks student from cancelling pending booking", async () => {
        mockAuth.mockResolvedValue({ user: { id: "stu", role: "USER" } });
        mockBookingFind.mockResolvedValue({
            id: bid,
            userId: "stu",
            teacherId: "t1",
            packageId: null,
            status: "PENDING",
        });
        const r = await cancelBooking(bid);
        expect(r.success).toBe(false);
        if (!r.success) {
            expect(r.error).toContain("administrator");
        }
    });

    it("blocks student from cancelling completed booking", async () => {
        mockAuth.mockResolvedValue({ user: { id: "stu", role: "USER" } });
        mockBookingFind.mockResolvedValue({
            id: bid,
            userId: "stu",
            teacherId: "t1",
            packageId: null,
            status: "COMPLETED",
        });
        const r = await cancelBooking(bid);
        expect(r).toEqual({
            success: false,
            error: "Only confirmed bookings can be cancelled or rescheduled.",
        });
    });

    it("allows admin to cancel pending booking", async () => {
        mockAuth.mockResolvedValue({ user: { id: "adm", role: "ADMIN" } });
        mockBookingFind.mockResolvedValue({
            id: bid,
            userId: "stu",
            teacherId: "t1",
            packageId: "pkg-1",
            status: "PENDING",
        });
        mockTeacherFind.mockResolvedValue(null);
        mockBookingDelete.mockResolvedValue({});

        const r = await cancelBooking(bid);
        expect(r).toEqual({ success: true });
        expect(mockBookingDelete).toHaveBeenCalledWith({ where: { id: bid } });
    });

    it("rejects when user cannot manage booking", async () => {
        mockAuth.mockResolvedValue({ user: { id: "other", role: "USER" } });
        mockBookingFind.mockResolvedValue({
            id: bid,
            userId: "stu",
            teacherId: "t1",
            packageId: null,
            status: "CONFIRMED",
        });

        const r = await cancelBooking(bid);
        expect(r).toEqual({
            success: false,
            error: "You cannot cancel this booking.",
        });
    });

    it("allows student to cancel own confirmed booking", async () => {
        mockAuth.mockResolvedValue({ user: { id: "stu", role: "USER" } });
        mockBookingFind.mockResolvedValue({
            id: bid,
            userId: "stu",
            teacherId: "t1",
            packageId: null,
            status: "CONFIRMED",
        });
        mockBookingDelete.mockResolvedValue({});

        const r = await cancelBooking(bid);
        expect(r).toEqual({ success: true });
    });
});
