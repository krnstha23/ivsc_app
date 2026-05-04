import { describe, expect, it, vi, beforeEach } from "vitest";

const mockFindFirst = vi.fn();
const mockTransaction = vi.fn();
const redirectMock = vi.fn(((_url?: string) => {
    throw new Error("REDIRECT_STUB");
}) as (url?: string) => never);

vi.mock("next/navigation", () => ({
    redirect: (url: string) => {
        redirectMock(url);
    },
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findFirst: (...a: unknown[]) => mockFindFirst(...a) },
        $transaction: (...a: unknown[]) => mockTransaction(...a),
    },
}));

vi.mock("@/lib/passwords", () => ({
    hashPassword: vi.fn().mockResolvedValue("hashed"),
}));

import { createAccount } from "@/app/register/actions";

const validStudent = {
    username: "newuser_test",
    firstName: "N",
    middleName: null,
    lastName: "U",
    phone: null,
    email: "newuser_test@example.com",
    userType: "student" as const,
    password: "password123",
};

describe("createAccount", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        redirectMock.mockImplementation(() => {
            throw new Error("REDIRECT_STUB");
        });
    });

    it("returns validation error for bad input", async () => {
        const r = await createAccount({
            ...validStudent,
            username: "ab",
        });
        expect(r.success).toBe(false);
        expect(mockTransaction).not.toHaveBeenCalled();
    });

    it("rejects duplicate username", async () => {
        mockFindFirst.mockResolvedValue({
            userName: validStudent.username,
            email: "other@example.com",
        });
        const r = await createAccount(validStudent);
        expect(r).toEqual({
            success: false,
            error: "This username is already taken.",
        });
    });

    it("rejects duplicate email", async () => {
        mockFindFirst.mockResolvedValue({
            userName: "someone_else",
            email: validStudent.email,
        });
        const r = await createAccount(validStudent);
        expect(r).toEqual({
            success: false,
            error: "An account with this email already exists.",
        });
    });

    it("creates student and redirects on success", async () => {
        mockFindFirst.mockResolvedValue(null);
        const studentCreate = vi.fn().mockResolvedValue({ id: "uid1" });
        const studentProfileCreate = vi.fn().mockResolvedValue({});
        mockTransaction.mockImplementation(
            async (fn: (tx: {
                user: { create: typeof studentCreate };
                studentProfile: { create: typeof studentProfileCreate };
                teacherProfile: { create: ReturnType<typeof vi.fn> };
            }) => Promise<void>) => {
                const txStub = {
                    user: { create: studentCreate },
                    studentProfile: { create: studentProfileCreate },
                    teacherProfile: { create: vi.fn() },
                };
                await fn(txStub);
            },
        );

        await expect(createAccount(validStudent)).rejects.toThrow("REDIRECT_STUB");
        expect(studentCreate).toHaveBeenCalled();
        expect(studentProfileCreate).toHaveBeenCalledWith({
            data: { userId: "uid1" },
        });
        expect(redirectMock).toHaveBeenCalledWith("/login?registered=1");
    });

    it("creates teacher profile when userType is teacher", async () => {
        mockFindFirst.mockResolvedValue(null);
        const userCreate = vi.fn().mockResolvedValue({ id: "tid1" });
        const teacherCreate = vi.fn().mockResolvedValue({});
        mockTransaction.mockImplementation(
            async (fn: (tx: {
                user: { create: typeof userCreate };
                studentProfile: { create: ReturnType<typeof vi.fn> };
                teacherProfile: { create: typeof teacherCreate };
            }) => Promise<void>) => {
                const txStub = {
                    user: { create: userCreate },
                    studentProfile: { create: vi.fn() },
                    teacherProfile: { create: teacherCreate },
                };
                await fn(txStub);
            },
        );

        await expect(
            createAccount({
                ...validStudent,
                email: "teacher_test@example.com",
                username: "teacher_test_u",
                userType: "teacher",
            }),
        ).rejects.toThrow("REDIRECT_STUB");

        expect(teacherCreate).toHaveBeenCalledWith({
            data: { userId: "tid1", isApproved: false },
        });
    });
});
