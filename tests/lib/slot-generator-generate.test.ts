import { describe, expect, it, vi, beforeEach } from "vitest";

const mockBundleFind = vi.fn();
const mockAvailFind = vi.fn();
const mockBookingFind = vi.fn();

vi.mock("@/lib/prisma", () => ({
    prisma: {
        packageBundle: {
            findUnique: (...a: unknown[]) => mockBundleFind(...a),
        },
        availability: {
            findMany: (...a: unknown[]) => mockAvailFind(...a),
        },
        booking: {
            findMany: (...a: unknown[]) => mockBookingFind(...a),
        },
    },
}));

import { generateSlots } from "@/lib/slot-generator";

describe("generateSlots", () => {
    const bundleId = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44";
    /** June 15, 2026 — matches UTC machine TZ from vitest.setup */
    const day = new Date(Date.UTC(2026, 5, 15, 12, 0, 0));

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns [] when bundle inactive", async () => {
        mockBundleFind.mockResolvedValue({ duration: 60, isActive: false });
        await expect(generateSlots(day, bundleId)).resolves.toEqual([]);
    });

    it("returns [] when bundle missing", async () => {
        mockBundleFind.mockResolvedValue(null);
        await expect(generateSlots(day, bundleId)).resolves.toEqual([]);
    });

    it("partitions an empty block into bookable segments", async () => {
        mockBundleFind.mockResolvedValue({ duration: 60, isActive: true });
        mockAvailFind.mockResolvedValue([
            {
                id: "av1",
                teacherId: "teacher-1",
                startTime: "10:00",
                endTime: "11:30",
                booking: null,
            },
        ]);
        mockBookingFind.mockResolvedValue([]);

        const slots = await generateSlots(day, bundleId);
        expect(slots).toHaveLength(1);
        expect(slots[0]).toMatchObject({
            teacherId: "teacher-1",
            startTime: "10:00",
            endTime: "11:00",
            availabilityId: "av1",
        });
    });

    it("skips segments that overlap booked sessions including gap", async () => {
        mockBundleFind.mockResolvedValue({ duration: 30, isActive: true });
        mockAvailFind.mockResolvedValue([
            {
                id: "av1",
                teacherId: "t1",
                startTime: "09:00",
                endTime: "12:00",
                booking: null,
            },
        ]);
        mockBookingFind.mockResolvedValue([
            {
                teacherId: "t1",
                scheduledAt: new Date(Date.UTC(2026, 5, 15, 10, 0)),
                duration: 30,
            },
        ]);

        const slots = await generateSlots(day, bundleId);
        const starts = slots.map((s) => s.startTime);
        expect(starts).not.toContain("10:00");
    });
});
