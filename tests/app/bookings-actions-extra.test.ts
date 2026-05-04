import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockTeacherFind = vi.fn();
const mockBookingFind = vi.fn();
const mockBookingUpdate = vi.fn();

vi.mock("@/lib/auth", () => ({
    auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        teacherProfile: {
            findUnique: (...a: unknown[]) => mockTeacherFind(...a),
        },
        booking: {
            findUnique: (...a: unknown[]) => mockBookingFind(...a),
            update: (...a: unknown[]) => mockBookingUpdate(...a),
        },
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import {
    completeBooking,
    completeBookingFromForm,
    rejectPendingBooking,
} from "@/app/(app)/bookings/actions";

const bid = "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55";
const teacherProfileId = "tp-main";

describe("completeBooking", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects non-teacher", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        const r = await completeBooking(bid);
        expect(r).toEqual({
            success: false,
            error: "Only teachers can complete bookings.",
        });
    });

    it("completes when teacher owns confirmed booking", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
        mockTeacherFind.mockResolvedValue({ id: teacherProfileId });
        mockBookingFind.mockResolvedValue({
            id: bid,
            teacherId: teacherProfileId,
            status: "CONFIRMED",
        });
        mockBookingUpdate.mockResolvedValue({});

        const r = await completeBooking(bid);
        expect(r).toEqual({ success: true });
        expect(mockBookingUpdate).toHaveBeenCalledWith({
            where: { id: bid },
            data: { status: "COMPLETED" },
        });
    });

    it("rejects when booking not confirmed", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
        mockTeacherFind.mockResolvedValue({ id: teacherProfileId });
        mockBookingFind.mockResolvedValue({
            id: bid,
            teacherId: teacherProfileId,
            status: "PENDING",
        });

        const r = await completeBooking(bid);
        expect(r.success).toBe(false);
        expect(mockBookingUpdate).not.toHaveBeenCalled();
    });
});

describe("completeBookingFromForm", () => {
    it("no-ops when booking id invalid", async () => {
        const fd = new FormData();
        fd.set("bookingId", "bad");
        await expect(completeBookingFromForm(fd)).resolves.toBeUndefined();
    });

    it("delegates to completeBooking when uuid valid", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
        mockTeacherFind.mockResolvedValue({ id: teacherProfileId });
        mockBookingFind.mockResolvedValue({
            id: bid,
            teacherId: teacherProfileId,
            status: "CONFIRMED",
        });
        mockBookingUpdate.mockResolvedValue({});

        const fd = new FormData();
        fd.set("bookingId", bid);
        await completeBookingFromForm(fd);
        expect(mockBookingUpdate).toHaveBeenCalled();
    });
});

describe("rejectPendingBooking", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({
            user: { role: "ADMIN", id: "adm" },
        });
    });

    it("validates reason length", async () => {
        const r = await rejectPendingBooking(bid, "");
        expect(r.success).toBe(false);
        expect(mockBookingUpdate).not.toHaveBeenCalled();
    });

    it("appends rejection to notes and cancels", async () => {
        mockBookingFind.mockResolvedValue({
            id: bid,
            status: "PENDING",
            notes: "prior",
        });
        mockBookingUpdate.mockResolvedValue({});

        const r = await rejectPendingBooking(bid, "No capacity");
        expect(r).toEqual({ success: true });
        expect(mockBookingUpdate).toHaveBeenCalledWith({
            where: { id: bid },
            data: {
                status: "CANCELLED",
                paymentStatus: "FAILED",
                notes: "prior\n[REJECTED] No capacity",
            },
        });
    });
});
