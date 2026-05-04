import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockFindFirst = vi.fn();
const mockUserUpdate = vi.fn();
const mockTeacherFind = vi.fn();
const mockTeacherUpdate = vi.fn();

vi.mock("@/lib/auth", () => ({
    auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: {
            findFirst: (...a: unknown[]) => mockFindFirst(...a),
            update: (...a: unknown[]) => mockUserUpdate(...a),
        },
        teacherProfile: {
            findUnique: (...a: unknown[]) => mockTeacherFind(...a),
            update: (...a: unknown[]) => mockTeacherUpdate(...a),
        },
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import { updateOwnProfile } from "@/app/(app)/profile/actions";

describe("updateOwnProfile", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects when not signed in", async () => {
        mockAuth.mockResolvedValue(null);
        const r = await updateOwnProfile({});
        expect(r).toEqual({ success: false, error: "You must be signed in." });
    });

    it("rejects invalid payload", async () => {
        mockAuth.mockResolvedValue({
            user: { id: "u1", role: "USER" },
        });
        const r = await updateOwnProfile({ email: "not-an-email" });
        expect(r.success).toBe(false);
    });

    it("rejects duplicate email", async () => {
        mockAuth.mockResolvedValue({
            user: { id: "u1", role: "USER" },
        });
        mockFindFirst.mockResolvedValue({ id: "other" });
        const r = await updateOwnProfile({
            firstName: "A",
            lastName: "B",
            email: "taken@example.com",
            phone: null,
            middleName: null,
            bio: null,
        });
        expect(r).toEqual({
            success: false,
            error: "Another account already uses this email.",
        });
        expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("updates user and teacher bio for TEACHER", async () => {
        mockAuth.mockResolvedValue({
            user: { id: "u1", role: "TEACHER" },
        });
        mockFindFirst.mockResolvedValue(null);
        mockTeacherFind.mockResolvedValue({ id: "tp1" });
        mockUserUpdate.mockResolvedValue({});
        mockTeacherUpdate.mockResolvedValue({});

        const r = await updateOwnProfile({
            firstName: "Teach",
            lastName: "Er",
            email: "teach@example.com",
            phone: null,
            middleName: null,
            bio: "Hello bio",
        });

        expect(r).toEqual({ success: true });
        expect(mockTeacherUpdate).toHaveBeenCalledWith({
            where: { id: "tp1" },
            data: { bio: "Hello bio" },
        });
    });

    it("skips teacher profile when role USER", async () => {
        mockAuth.mockResolvedValue({
            user: { id: "u1", role: "USER" },
        });
        mockFindFirst.mockResolvedValue(null);
        mockUserUpdate.mockResolvedValue({});

        const r = await updateOwnProfile({
            firstName: "S",
            lastName: "T",
            email: "s@example.com",
            phone: null,
            middleName: null,
        });

        expect(r.success).toBe(true);
        expect(mockTeacherFind).not.toHaveBeenCalled();
    });
});
