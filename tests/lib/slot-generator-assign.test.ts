import { describe, expect, it, vi, beforeEach } from "vitest";

const mockBookingFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
    prisma: {
        booking: {
            findMany: (...a: unknown[]) => mockBookingFindMany(...a),
        },
    },
}));

import { assignTeacher } from "@/lib/slot-generator";

describe("assignTeacher", () => {
    const date = new Date(Date.UTC(2026, 5, 15, 8, 0, 0));

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns sole candidate", async () => {
        await expect(assignTeacher(["only"], date)).resolves.toBe("only");
        expect(mockBookingFindMany).not.toHaveBeenCalled();
    });

    it("picks lowest load, tie-break by teacher id", async () => {
        mockBookingFindMany.mockResolvedValue([
            { teacherId: "b" },
            { teacherId: "b" },
            { teacherId: "a" },
        ]);
        await expect(assignTeacher(["b", "a", "c"], date)).resolves.toBe("c");
    });
});
