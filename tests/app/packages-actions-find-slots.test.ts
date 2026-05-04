import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockAuth = vi.fn();
const mockBookingFindUnique = vi.fn();
const mockTeacherFindUnique = vi.fn();
const mockAvailFindMany = vi.fn();
const mockGenerateSlots = vi.fn();

vi.mock("@/lib/auth", () => ({
    auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        booking: {
            findUnique: (...a: unknown[]) => mockBookingFindUnique(...a),
        },
        teacherProfile: {
            findUnique: (...a: unknown[]) => mockTeacherFindUnique(...a),
        },
        availability: {
            findMany: (...a: unknown[]) => mockAvailFindMany(...a),
        },
    },
}));

vi.mock("@/lib/slot-generator", async (importOriginal) => {
    const actual =
        await importOriginal<typeof import("@/lib/slot-generator")>();
    return {
        ...actual,
        generateSlots: (...a: unknown[]) => mockGenerateSlots(...a),
        computeLeadTimeCategory: vi
            .fn()
            .mockReturnValue("STANDARD" as import("@/lib/slot-generator").LeadTimeCategory),
    };
});

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import { findSlotsForReschedule } from "@/app/(app)/packages/actions";

const bid = "a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const bundleId = "b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

describe("findSlotsForReschedule", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-06-15T14:30:00.000Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns no slots when not signed in", async () => {
        mockAuth.mockResolvedValue(null);
        const r = await findSlotsForReschedule(bid, "2026-06-20");
        expect(r.slots).toEqual([]);
    });

    it("returns no slots for invalid booking id", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        const r = await findSlotsForReschedule("bad-id", "2026-06-20");
        expect(r.slots).toEqual([]);
    });

    it("returns no slots when booking missing", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBookingFindUnique.mockResolvedValue(null);
        const r = await findSlotsForReschedule(bid, "2026-06-20");
        expect(r.slots).toEqual([]);
    });

    it("returns no slots for pending booking", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBookingFindUnique.mockResolvedValue({
            id: bid,
            userId: "u1",
            teacherId: "t1",
            bundleId,
            duration: 60,
            status: "PENDING",
        });
        const r = await findSlotsForReschedule(bid, "2026-06-20");
        expect(r.slots).toEqual([]);
    });

    it("returns no slots when student cannot reschedule non-confirmed", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBookingFindUnique.mockResolvedValue({
            id: bid,
            userId: "u1",
            teacherId: "t1",
            bundleId,
            duration: 60,
            status: "COMPLETED",
        });
        const r = await findSlotsForReschedule(bid, "2026-06-20");
        expect(r.slots).toEqual([]);
    });

    it("returns no slots when user cannot manage booking", async () => {
        mockAuth.mockResolvedValue({ user: { id: "other", role: "USER" } });
        mockBookingFindUnique.mockResolvedValue({
            id: bid,
            userId: "u1",
            teacherId: "t1",
            bundleId,
            duration: 60,
            status: "CONFIRMED",
        });
        const r = await findSlotsForReschedule(bid, "2026-06-20");
        expect(r.slots).toEqual([]);
    });

    it("maps bundle slots from generateSlots", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBookingFindUnique.mockResolvedValue({
            id: bid,
            userId: "u1",
            teacherId: "t1",
            bundleId,
            duration: 60,
            status: "CONFIRMED",
        });
        mockGenerateSlots.mockResolvedValue([
            {
                startTime: "16:00",
                endTime: "17:00",
                teacherId: "tp1",
            },
        ]);

        const r = await findSlotsForReschedule(bid, "2026-06-15");
        expect(r.slots.length).toBe(1);
        expect(r.slots[0]!.startTime).toBe("16:00");
        expect(r.slots[0]!.category).toBe("STANDARD");
    });

    it("builds slots from availability blocks when no bundle", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBookingFindUnique.mockResolvedValue({
            id: bid,
            userId: "u1",
            teacherId: "t1",
            bundleId: null,
            duration: 60,
            status: "CONFIRMED",
        });
        mockAvailFindMany.mockResolvedValue([
            { startTime: "09:00", endTime: "11:00" },
        ]);

        const r = await findSlotsForReschedule(bid, "2026-06-20");
        expect(r.slots.length).toBeGreaterThan(0);
        expect(r.slots[0]!.date).toBe("2026-06-20");
    });
});
