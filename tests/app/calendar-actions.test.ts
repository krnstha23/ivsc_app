import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/auth", () => ({
    auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        booking: {
            findMany: (...a: unknown[]) => mockFindMany(...a),
        },
    },
}));

import {
    getBookingsByMonth,
    getBookingsForDay,
} from "@/app/(app)/calendar/actions";

describe("calendar actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getBookingsByMonth", () => {
        it("returns {} when unauthenticated", async () => {
            mockAuth.mockResolvedValue(null);
            await expect(getBookingsByMonth(2026, 5)).resolves.toEqual({});
        });

        it("returns {} when not admin", async () => {
            mockAuth.mockResolvedValue({ user: { role: "USER" } });
            await expect(getBookingsByMonth(2026, 5)).resolves.toEqual({});
        });

        it("aggregates counts per day for admin", async () => {
            mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
            mockFindMany.mockResolvedValue([
                { scheduledAt: new Date(Date.UTC(2026, 5, 10, 10, 0)) },
                { scheduledAt: new Date(Date.UTC(2026, 5, 10, 14, 0)) },
                { scheduledAt: new Date(Date.UTC(2026, 5, 15, 9, 0)) },
            ]);
            const r = await getBookingsByMonth(2026, 5);
            expect(r["2026-06-10"]).toBe(2);
            expect(r["2026-06-15"]).toBe(1);
        });
    });

    describe("getBookingsForDay", () => {
        it("returns [] when unauthenticated", async () => {
            mockAuth.mockResolvedValue(null);
            await expect(
                getBookingsForDay(new Date(Date.UTC(2026, 6, 1))),
            ).resolves.toEqual([]);
        });

        it("maps bookings for admin", async () => {
            mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
            mockFindMany.mockResolvedValue([
                {
                    id: "b1",
                    scheduledAt: new Date(Date.UTC(2026, 6, 1, 10, 30)),
                    duration: 60,
                    status: "CONFIRMED",
                    packageId: null,
                    teacher: {
                        user: {
                            firstName: "T",
                            middleName: null,
                            lastName: "One",
                        },
                    },
                    user: {
                        firstName: "S",
                        middleName: "M",
                        lastName: "Two",
                    },
                },
            ]);
            const rows = await getBookingsForDay(new Date(Date.UTC(2026, 6, 1)));
            expect(rows).toHaveLength(1);
            expect(rows[0]!.viewerMayReschedule).toBe(true);
            expect(rows[0]!.teacherName).toContain("T");
            expect(rows[0]!.studentName).toContain("S");
            expect(rows[0]!.startTime).toBe("10:30");
        });
    });
});
