import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockTpFindUnique = vi.fn();
const mockAvailFindMany = vi.fn();
const mockAvailFindUnique = vi.fn();
const mockAvailUpdate = vi.fn();
const mockTx = vi.fn();

vi.mock("@/lib/auth", () => ({
    auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        teacherProfile: {
            findUnique: (...a: unknown[]) => mockTpFindUnique(...a),
        },
        availability: {
            findMany: (...a: unknown[]) => mockAvailFindMany(...a),
            findUnique: (...a: unknown[]) => mockAvailFindUnique(...a),
            update: (...a: unknown[]) => mockAvailUpdate(...a),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            create: vi.fn().mockResolvedValue({ id: "new" }),
        },
        $transaction: (...a: unknown[]) => mockTx(...a),
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import {
    adminCreateAvailability,
    updateAvailability,
} from "@/app/(app)/teachers/actions";

const tpId = "a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const slotId = "b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

describe("adminCreateAvailability", () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
                        create: vi.fn().mockResolvedValue({ id: "av" }),
                    },
                });
            },
        );
    });

    it("rejects when not signed in", async () => {
        mockAuth.mockResolvedValue(null);
        const r = await adminCreateAvailability({
            teacherId: tpId,
            date: new Date("2026-10-01"),
            startTime: "09:00",
            endTime: "11:00",
        });
        expect(r).toEqual({
            success: false,
            error: "You must be signed in.",
        });
    });

    it("rejects non-admin", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
        const r = await adminCreateAvailability({
            teacherId: tpId,
            date: new Date("2026-10-01"),
            startTime: "09:00",
            endTime: "11:00",
        });
        expect(r.success).toBe(false);
        if (!r.success) expect(r.error).toContain("admins");
    });

    it("rejects when teacher missing", async () => {
        mockAuth.mockResolvedValue({ user: { id: "adm", role: "ADMIN" } });
        mockTpFindUnique.mockResolvedValue(null);
        const r = await adminCreateAvailability({
            teacherId: tpId,
            date: new Date("2026-10-01"),
            startTime: "09:00",
            endTime: "11:00",
        });
        expect(r).toEqual({
            success: false,
            error: "Teacher profile not found.",
        });
    });

    it("rejects unapproved teacher", async () => {
        mockAuth.mockResolvedValue({ user: { id: "adm", role: "ADMIN" } });
        mockTpFindUnique.mockResolvedValue({
            id: tpId,
            isApproved: false,
            isActive: true,
        });
        const r = await adminCreateAvailability({
            teacherId: tpId,
            date: new Date("2026-10-01"),
            startTime: "09:00",
            endTime: "11:00",
        });
        expect(r.success).toBe(false);
        if (!r.success) expect(r.error).toContain("approved");
    });

    it("rejects inactive teacher", async () => {
        mockAuth.mockResolvedValue({ user: { id: "adm", role: "ADMIN" } });
        mockTpFindUnique.mockResolvedValue({
            id: tpId,
            isApproved: true,
            isActive: false,
        });
        const r = await adminCreateAvailability({
            teacherId: tpId,
            date: new Date("2026-10-01"),
            startTime: "09:00",
            endTime: "11:00",
        });
        expect(r.success).toBe(false);
        if (!r.success) expect(r.error).toContain("active");
    });

    it("rejects merge overlap with booked block", async () => {
        mockAuth.mockResolvedValue({ user: { id: "adm", role: "ADMIN" } });
        mockTpFindUnique.mockResolvedValue({
            id: tpId,
            isApproved: true,
            isActive: true,
        });
        mockAvailFindMany.mockResolvedValue([
            {
                id: "row1",
                startTime: "09:30",
                endTime: "12:00",
                booking: { id: "b1" },
            },
        ]);

        const r = await adminCreateAvailability({
            teacherId: tpId,
            date: new Date("2026-10-01"),
            startTime: "09:00",
            endTime: "10:00",
        });
        expect(r.success).toBe(false);
        if (!r.success) {
            expect(r.error).toContain("booking");
        }
    });

    it("creates availability for approved teacher", async () => {
        mockAuth.mockResolvedValue({ user: { id: "adm", role: "ADMIN" } });
        mockTpFindUnique.mockResolvedValue({
            id: tpId,
            isApproved: true,
            isActive: true,
        });
        mockAvailFindMany.mockResolvedValue([]);

        const r = await adminCreateAvailability({
            teacherId: tpId,
            date: new Date("2026-10-01"),
            startTime: "09:00",
            endTime: "11:00",
        });
        expect(r).toEqual({ success: true });
        expect(mockTx).toHaveBeenCalled();
    });
});

describe("updateAvailability", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAvailFindMany.mockImplementation((args: { where?: { NOT?: unknown } }) => {
            if (args.where?.NOT) {
                return Promise.resolve([]);
            }
            return Promise.resolve([]);
        });
    });

    it("rejects when slot has booking", async () => {
        mockAuth.mockResolvedValue({ user: { id: "adm", role: "ADMIN" } });
        mockAvailFindUnique.mockResolvedValue({
            id: slotId,
            teacherId: tpId,
            booking: { id: "b1" },
        });

        const r = await updateAvailability({
            id: slotId,
            date: new Date("2026-10-02"),
            startTime: "10:00",
            endTime: "12:00",
        });
        expect(r.success).toBe(false);
        if (!r.success) expect(r.error).toContain("booking");
    });

    it("allows admin to update unbooked slot", async () => {
        mockAuth.mockResolvedValue({ user: { id: "adm", role: "ADMIN" } });
        mockAvailFindUnique.mockResolvedValue({
            id: slotId,
            teacherId: tpId,
            booking: null,
        });
        mockAvailUpdate.mockResolvedValue({});

        const r = await updateAvailability({
            id: slotId,
            date: new Date("2026-10-02"),
            startTime: "10:00",
            endTime: "12:00",
        });
        expect(r).toEqual({ success: true });
        expect(mockAvailUpdate).toHaveBeenCalled();
    });

    it("allows teacher to update own unbooked slot", async () => {
        mockAuth.mockResolvedValue({ user: { id: "t-user", role: "TEACHER" } });
        mockAvailFindUnique.mockResolvedValue({
            id: slotId,
            teacherId: tpId,
            booking: null,
        });
        mockTpFindUnique.mockResolvedValue({ id: tpId });
        mockAvailUpdate.mockResolvedValue({});

        const r = await updateAvailability({
            id: slotId,
            date: new Date("2026-10-02"),
            startTime: "14:00",
            endTime: "16:00",
        });
        expect(r).toEqual({ success: true });
        expect(mockAvailUpdate).toHaveBeenCalled();
    });
});
