import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockTpFind = vi.fn();
const mockAvailFindMany = vi.fn();
const mockTx = vi.fn();

vi.mock("@/lib/auth", () => ({
    auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        teacherProfile: {
            findUnique: (...a: unknown[]) => mockTpFind(...a),
        },
        availability: {
            findMany: (...a: unknown[]) => mockAvailFindMany(...a),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            create: vi.fn().mockResolvedValue({ id: "av-new" }),
        },
        $transaction: (...a: unknown[]) => mockTx(...a),
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import { createAvailability } from "@/app/(app)/teachers/actions";

describe("createAvailability", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAvailFindMany.mockResolvedValue([]);
        mockTpFind.mockResolvedValue({
            id: "tp1",
            isApproved: true,
            isActive: true,
        });
        mockTx.mockImplementation(
            async (fn: (tx: {
                availability: {
                    deleteMany: ReturnType<typeof vi.fn>;
                    create: ReturnType<typeof vi.fn>;
                };
            }) => Promise<void>) => {
                await fn({
                    availability: {
                        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
                        create: vi.fn().mockResolvedValue({ id: "new" }),
                    },
                });
            },
        );
    });

    it("rejects when not signed in", async () => {
        mockAuth.mockResolvedValue(null);
        const r = await createAvailability({
            date: new Date("2026-09-01"),
            startTime: "09:00",
            endTime: "11:00",
        });
        expect(r).toEqual({
            success: false,
            error: "You must be signed in.",
        });
    });

    it("rejects non-teacher", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        const r = await createAvailability({
            date: new Date("2026-09-01"),
            startTime: "09:00",
            endTime: "11:00",
        });
        expect(r).toEqual({
            success: false,
            error: "Only teachers can create availability.",
        });
    });

    it("rejects invalid times", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
        const r = await createAvailability({
            date: new Date("2026-09-01"),
            startTime: "bad",
            endTime: "11:00",
        });
        expect(r.success).toBe(false);
    });

    it("rejects when teacher profile missing", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
        mockTpFind.mockResolvedValue(null);
        const r = await createAvailability({
            date: new Date("2026-09-01"),
            startTime: "09:00",
            endTime: "11:00",
        });
        expect(r).toEqual({
            success: false,
            error: "Teacher profile not found.",
        });
    });

    it("rejects when teacher not approved", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
        mockTpFind.mockResolvedValue({
            id: "tp1",
            isApproved: false,
            isActive: true,
        });
        const r = await createAvailability({
            date: new Date("2026-09-01"),
            startTime: "09:00",
            endTime: "11:00",
        });
        expect(r.success).toBe(false);
        if (!r.success) {
            expect(r.error).toContain("approval");
        }
    });

    it("creates availability on empty day", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
        const r = await createAvailability({
            date: new Date("2026-09-01"),
            startTime: "09:00",
            endTime: "11:00",
        });
        expect(r).toEqual({ success: true });
        expect(mockTx).toHaveBeenCalled();
    });
});
