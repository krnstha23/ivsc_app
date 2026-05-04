import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockUpdateMany = vi.fn();
const redirectMock = vi.fn(((_url?: string) => {
    throw new Error("REDIRECT");
}) as (url?: string) => never);

vi.mock("@/lib/auth", () => ({
    auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        teacherProfile: {
            updateMany: (...a: unknown[]) => mockUpdateMany(...a),
        },
    },
}));

vi.mock("next/navigation", () => ({
    redirect: (url: string) => {
        redirectMock(url);
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import { approveTeacher } from "@/app/(app)/users/actions";

describe("approveTeacher", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("redirects non-admin to dashboard", async () => {
        mockAuth.mockResolvedValue({ user: { role: "USER" } });
        const fd = new FormData();
        fd.set("userId", "u1");
        await expect(approveTeacher(fd)).rejects.toThrow("REDIRECT");
        expect(redirectMock).toHaveBeenCalledWith("/dashboard");
    });

    it("approves teacher and redirects to users", async () => {
        mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
        mockUpdateMany.mockResolvedValue({ count: 1 });
        const fd = new FormData();
        fd.set("userId", "teacher-user-id");

        await expect(approveTeacher(fd)).rejects.toThrow("REDIRECT");
        expect(mockUpdateMany).toHaveBeenCalledWith({
            where: { userId: "teacher-user-id" },
            data: { isApproved: true },
        });
        expect(redirectMock).toHaveBeenCalledWith("/users");
    });
});
