import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/auth", () => ({
    auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        availability: {
            findMany: (...a: unknown[]) => mockFindMany(...a),
        },
    },
}));

import { getAvailableSlotsForBundle } from "@/app/(app)/teachers/actions";

const bundleId = "c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";

describe("getAvailableSlotsForBundle", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns empty list when not authenticated", async () => {
        mockAuth.mockResolvedValue(null);
        await expect(
            getAvailableSlotsForBundle(bundleId, new Date("2026-11-01")),
        ).resolves.toEqual([]);
        expect(mockFindMany).not.toHaveBeenCalled();
    });

    it("maps slots with duration and fallback teacher name", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1" } });
        mockFindMany.mockResolvedValue([
            {
                id: "s1",
                startTime: "09:00",
                endTime: "10:30",
                teacherId: "tp1",
                teacher: {
                    user: {
                        firstName: "Jay",
                        middleName: null,
                        lastName: "Que",
                    },
                },
            },
            {
                id: "s2",
                startTime: "11:00",
                endTime: "12:00",
                teacherId: "tp2",
                teacher: {
                    user: {
                        firstName: null,
                        middleName: null,
                        lastName: null,
                    },
                },
            },
        ]);

        const r = await getAvailableSlotsForBundle(
            bundleId,
            new Date("2026-11-05"),
        );
        expect(r).toHaveLength(2);
        expect(r[0]!.teacherName).toContain("Jay");
        expect(r[0]!.durationMinutes).toBe(90);
        expect(r[1]!.teacherName).toBe("Teacher");
    });
});
