import { describe, expect, it, vi, beforeEach } from "vitest";

const mockUserFind = vi.fn();
const mockBookingFindMany = vi.fn();
const mockBookingCount = vi.fn();
const mockTeacherFind = vi.fn();
const mockTpFindMany = vi.fn();
const mockTpCount = vi.fn();
const mockUserCount = vi.fn();

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: {
            findUnique: (...a: unknown[]) => mockUserFind(...a),
            count: (...a: unknown[]) => mockUserCount(...a),
        },
        booking: {
            findMany: (...a: unknown[]) => mockBookingFindMany(...a),
            count: (...a: unknown[]) => mockBookingCount(...a),
        },
        teacherProfile: {
            findUnique: (...a: unknown[]) => mockTeacherFind(...a),
            findMany: (...a: unknown[]) => mockTpFindMany(...a),
            count: (...a: unknown[]) => mockTpCount(...a),
        },
    },
}));

import {
    getStudentDashboardData,
    getTeacherDashboardData,
    getAdminDashboardData,
} from "@/lib/dashboard-data";

describe("dashboard-data", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("getStudentDashboardData maps bookings", async () => {
        const soon = new Date(Date.now() + 86_400_000);
        mockUserFind.mockResolvedValue({ firstName: "Sam" });
        mockBookingFindMany.mockResolvedValue([
            {
                id: "b1",
                scheduledAt: soon,
                duration: 60,
                status: "CONFIRMED",
                meetLink: null,
                package: { name: "P1" },
                teacher: {
                    user: { firstName: "T", lastName: "One" },
                },
            },
        ]);
        mockBookingCount.mockResolvedValueOnce(3).mockResolvedValueOnce(10);

        const d = await getStudentDashboardData("user-1");
        expect(d.firstName).toBe("Sam");
        expect(d.upcomingCount).toBe(3);
        expect(d.completedCount).toBe(10);
        expect(d.upcoming).toHaveLength(1);
        expect(d.next?.packageName).toBe("P1");
    });

    it("getTeacherDashboardData returns no_profile", async () => {
        mockTeacherFind.mockResolvedValue(null);
        const d = await getTeacherDashboardData("u1");
        expect(d).toEqual({ ok: false, reason: "no_profile" });
    });

    it("getTeacherDashboardData returns ok branch", async () => {
        mockTeacherFind.mockResolvedValue({
            id: "tp1",
            user: { firstName: "Teach" },
        });
        mockBookingFindMany.mockResolvedValue([]);
        mockBookingCount.mockResolvedValueOnce(0).mockResolvedValueOnce(2);

        const d = await getTeacherDashboardData("u1");
        expect(d.ok).toBe(true);
        if (d.ok) {
            expect(d.firstName).toBe("Teach");
            expect(d.upcomingCount).toBe(0);
        }
    });

    it("getAdminDashboardData aggregates counts", async () => {
        mockUserCount
            .mockResolvedValueOnce(100)
            .mockResolvedValueOnce(12);
        mockTpCount.mockResolvedValue(8);
        mockBookingCount
            .mockResolvedValueOnce(5)
            .mockResolvedValueOnce(3);

        const d = await getAdminDashboardData();
        expect(d).toEqual({
            userCount: 100,
            teacherCount: 12,
            approvedTeachers: 8,
            pendingBookings: 5,
            sessionsToday: 3,
        });
    });
});
