import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockAvailFind = vi.fn();
const mockAvailDelete = vi.fn();
const mockTpFind = vi.fn();
const mockTpUpdate = vi.fn();
const mockTpFindMany = vi.fn();

vi.mock("@/lib/auth", () => ({
    auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        availability: {
            findUnique: (...a: unknown[]) => mockAvailFind(...a),
            delete: (...a: unknown[]) => mockAvailDelete(...a),
        },
        teacherProfile: {
            findUnique: (...a: unknown[]) => mockTpFind(...a),
            findMany: (...a: unknown[]) => mockTpFindMany(...a),
            update: (...a: unknown[]) => mockTpUpdate(...a),
        },
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import {
    getSessionTeacherProfileId,
    deleteAvailability,
    approveTeacherFromManage,
    toggleTeacherActive,
    getApprovedTeachersForAdmin,
} from "@/app/(app)/teachers/actions";

const avId = "d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("teachers actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getSessionTeacherProfileId", () => {
        it("returns null for student", async () => {
            mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
            await expect(getSessionTeacherProfileId()).resolves.toBeNull();
        });

        it("returns teacher profile id", async () => {
            mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
            mockTpFind.mockResolvedValue({ id: "tp-1" });
            await expect(getSessionTeacherProfileId()).resolves.toBe("tp-1");
        });
    });

    describe("deleteAvailability", () => {
        it("rejects when slot has booking", async () => {
            mockAuth.mockResolvedValue({ user: { id: "adm", role: "ADMIN" } });
            mockAvailFind.mockResolvedValue({
                id: avId,
                teacherId: "t1",
                booking: { id: "b1" },
            });
            const r = await deleteAvailability(avId);
            expect(r.success).toBe(false);
            expect(mockAvailDelete).not.toHaveBeenCalled();
        });

        it("allows admin delete", async () => {
            mockAuth.mockResolvedValue({ user: { id: "adm", role: "ADMIN" } });
            mockAvailFind.mockResolvedValue({
                id: avId,
                teacherId: "t1",
                booking: null,
            });
            mockAvailDelete.mockResolvedValue({});

            const r = await deleteAvailability(avId);
            expect(r).toEqual({ success: true });
        });
    });

    describe("approveTeacherFromManage", () => {
        it("updates approval", async () => {
            mockAuth.mockResolvedValue({ user: { role: "ADMIN", id: "a1" } });
            mockTpFind.mockResolvedValue({ id: "tp1", isApproved: false });
            mockTpUpdate.mockResolvedValue({});

            const r = await approveTeacherFromManage("user-x");
            expect(r).toEqual({ success: true });
            expect(mockTpUpdate).toHaveBeenCalledWith({
                where: { id: "tp1" },
                data: { isApproved: true },
            });
        });
    });

    describe("toggleTeacherActive", () => {
        it("toggles isActive", async () => {
            mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
            mockTpFind.mockResolvedValue({ id: "tp1", isActive: true });
            mockTpUpdate.mockResolvedValue({});

            const r = await toggleTeacherActive("tp1");
            expect(r).toEqual({ success: true });
            expect(mockTpUpdate).toHaveBeenCalledWith({
                where: { id: "tp1" },
                data: { isActive: false },
            });
        });
    });

    describe("getApprovedTeachersForAdmin", () => {
        it("returns [] for non-admin", async () => {
            mockAuth.mockResolvedValue({ user: { role: "TEACHER" } });
            await expect(getApprovedTeachersForAdmin()).resolves.toEqual([]);
        });

        it("maps teachers for admin", async () => {
            mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
            mockTpFindMany.mockResolvedValue([
                {
                    id: "tp1",
                    user: {
                        firstName: "Ann",
                        middleName: null,
                        lastName: "Lee",
                        userName: "ann",
                    },
                },
            ]);

            const r = await getApprovedTeachersForAdmin();
            expect(r).toHaveLength(1);
            expect(r[0]!.teacherName).toContain("Ann");
            expect(r[0]!.teacherName).toContain("@ann");
        });
    });
});
