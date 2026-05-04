import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockAvailFindMany = vi.fn();

vi.mock("@/lib/auth", () => ({
    auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        availability: {
            findMany: (...a: unknown[]) => mockAvailFindMany(...a),
        },
    },
}));

import {
    getTeacherAvailabilityForMonth,
    getTeacherAvailabilityForDay,
} from "@/app/(app)/teachers/actions";

describe("teacher availability views", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getTeacherAvailabilityForMonth", () => {
        it("returns {} when not signed in", async () => {
            mockAuth.mockResolvedValue(null);
            await expect(getTeacherAvailabilityForMonth(2026, 4)).resolves.toEqual(
                {},
            );
            expect(mockAvailFindMany).not.toHaveBeenCalled();
        });

        it("aggregates slot counts by UTC day key", async () => {
            mockAuth.mockResolvedValue({ user: { id: "u1" } });
            const d1 = new Date(Date.UTC(2026, 4, 3, 12, 0, 0));
            const d2 = new Date(Date.UTC(2026, 4, 3, 18, 0, 0));
            const d3 = new Date(Date.UTC(2026, 4, 10, 8, 0, 0));
            mockAvailFindMany.mockResolvedValue([
                { date: d1 },
                { date: d2 },
                { date: d3 },
            ]);

            const r = await getTeacherAvailabilityForMonth(2026, 4);
            expect(r["2026-05-03"]).toBe(2);
            expect(r["2026-05-10"]).toBe(1);
        });
    });

    describe("getTeacherAvailabilityForDay", () => {
        it("returns empty slots when not signed in", async () => {
            mockAuth.mockResolvedValue(null);
            const r = await getTeacherAvailabilityForDay(new Date("2026-05-04"));
            expect(r).toEqual({ slots: [] });
        });

        it("maps slots with teacher names and booking flag", async () => {
            mockAuth.mockResolvedValue({ user: { id: "u1" } });
            mockAvailFindMany.mockResolvedValue([
                {
                    id: "s1",
                    startTime: "09:00",
                    endTime: "10:00",
                    teacherId: "tp1",
                    booking: { id: "b1" },
                    teacher: {
                        user: {
                            firstName: "Pat",
                            middleName: null,
                            lastName: "Kim",
                        },
                    },
                },
                {
                    id: "s2",
                    startTime: "11:00",
                    endTime: "12:00",
                    teacherId: "tp2",
                    booking: null,
                    teacher: {
                        user: {
                            firstName: null,
                            middleName: null,
                            lastName: null,
                        },
                    },
                },
            ]);

            const r = await getTeacherAvailabilityForDay(new Date("2026-05-04"));
            expect(r.slots).toHaveLength(2);
            expect(r.slots[0]!.hasBooking).toBe(true);
            expect(r.slots[0]!.teacherName).toContain("Pat");
            expect(r.slots[1]!.hasBooking).toBe(false);
            expect(r.slots[1]!.teacherName).toBe("Teacher");
        });
    });
});
