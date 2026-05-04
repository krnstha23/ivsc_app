import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockUserFindFirst = vi.fn();
const mockUserFindUnique = vi.fn();
const mockTransaction = vi.fn();
const redirectMock = vi.fn(((_url?: string) => {
    throw new Error("REDIRECT");
}) as (url?: string) => never);

vi.mock("@/lib/auth", () => ({
    auth: () => mockAuth(),
}));

vi.mock("@/lib/passwords", () => ({
    hashPassword: vi.fn().mockResolvedValue("hashed-password"),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: {
            findFirst: (...a: unknown[]) => mockUserFindFirst(...a),
            findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
        },
        $transaction: (...a: unknown[]) => mockTransaction(...a),
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

import { createUser, updateUser } from "@/app/(app)/users/actions";

const uid = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

function adminFd() {
    const fd = new FormData();
    fd.set("username", "newuser");
    fd.set("email", "newuser@example.com");
    fd.set("password", "password12");
    fd.set("firstName", "N");
    fd.set("lastName", "U");
    fd.set("role", "USER");
    fd.set("isActive", "on");
    return fd;
}

describe("createUser", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockTransaction.mockImplementation(
            async (fn: (tx: {
                user: { create: ReturnType<typeof vi.fn> };
                studentProfile: { create: ReturnType<typeof vi.fn> };
                teacherProfile: { create: ReturnType<typeof vi.fn> };
            }) => Promise<unknown>) => {
                return fn({
                    user: {
                        create: vi.fn().mockResolvedValue({ id: "created-id" }),
                    },
                    studentProfile: {
                        create: vi.fn().mockResolvedValue({}),
                    },
                    teacherProfile: {
                        create: vi.fn().mockResolvedValue({}),
                    },
                });
            },
        );
    });

    it("redirects non-admin", async () => {
        mockAuth.mockResolvedValue({ user: { role: "USER" } });
        await expect(createUser(adminFd())).rejects.toThrow("REDIRECT");
        expect(redirectMock).toHaveBeenCalledWith("/dashboard");
    });

    it("redirects on validation failure", async () => {
        mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
        const fd = new FormData();
        fd.set("username", "ab");
        fd.set("email", "x@x.com");
        fd.set("password", "short");
        fd.set("firstName", "A");
        fd.set("lastName", "B");

        await expect(createUser(fd)).rejects.toThrow("REDIRECT");
        expect(redirectMock.mock.calls[0]![0]).toContain("/users/new?error=");
    });

    it("redirects when username or email exists", async () => {
        mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
        mockUserFindFirst.mockResolvedValue({
            userName: "newuser",
            email: "other@example.com",
        });

        await expect(createUser(adminFd())).rejects.toThrow("REDIRECT");
        expect(redirectMock.mock.calls[0]![0]).toContain("error=exists");
        expect(redirectMock.mock.calls[0]![0]).toContain("field=username");
    });

    it("creates student user and profile", async () => {
        mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
        mockUserFindFirst.mockResolvedValue(null);

        await expect(createUser(adminFd())).rejects.toThrow("REDIRECT");
        expect(redirectMock).toHaveBeenCalledWith("/users");
        expect(mockTransaction).toHaveBeenCalled();
    });

    it("creates teacher with teacher profile", async () => {
        mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
        mockUserFindFirst.mockResolvedValue(null);
        const fd = adminFd();
        fd.set("role", "TEACHER");

        await expect(createUser(fd)).rejects.toThrow("REDIRECT");
        expect(mockTransaction).toHaveBeenCalled();
    });
});

describe("updateUser", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockTransaction.mockImplementation(
            async (fn: (tx: {
                user: { update: ReturnType<typeof vi.fn> };
                studentProfile: { create: ReturnType<typeof vi.fn> };
                teacherProfile: { create: ReturnType<typeof vi.fn> };
            }) => Promise<unknown>) => {
                return fn({
                    user: {
                        update: vi.fn().mockResolvedValue({}),
                    },
                    studentProfile: {
                        create: vi.fn().mockResolvedValue({}),
                    },
                    teacherProfile: {
                        create: vi.fn().mockResolvedValue({}),
                    },
                });
            },
        );
    });

    it("redirects on validation error", async () => {
        mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
        const fd = new FormData();
        fd.set("id", uid);
        fd.set("firstName", "A");
        fd.set("lastName", "B");
        fd.set("email", "not-an-email");
        fd.set("role", "USER");

        await expect(updateUser(fd)).rejects.toThrow("REDIRECT");
        expect(redirectMock.mock.calls[0]![0]).toContain("/edit?error=");
    });

    it("redirects non-admin", async () => {
        mockAuth.mockResolvedValue({ user: { role: "TEACHER" } });
        const fd = new FormData();
        fd.set("id", uid);
        await expect(updateUser(fd)).rejects.toThrow("REDIRECT");
        expect(redirectMock).toHaveBeenCalledWith("/dashboard");
    });

    it("redirects when user missing", async () => {
        mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
        mockUserFindUnique.mockResolvedValue(null);
        const fd = new FormData();
        fd.set("id", uid);
        fd.set("firstName", "A");
        fd.set("lastName", "B");
        fd.set("email", "a@b.com");
        fd.set("role", "USER");
        fd.set("newPassword", "");

        await expect(updateUser(fd)).rejects.toThrow("REDIRECT");
        expect(redirectMock).toHaveBeenCalledWith("/users?error=user_not_found");
    });

    it("redirects when email taken", async () => {
        mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
        mockUserFindUnique.mockResolvedValue({
            id: uid,
            userName: "x",
            role: "USER",
            studentProfile: { id: "sp1" },
            teacherProfile: null,
        });
        mockUserFindFirst.mockResolvedValue({ id: "other" });

        const fd = new FormData();
        fd.set("id", uid);
        fd.set("firstName", "A");
        fd.set("lastName", "B");
        fd.set("email", "taken@example.com");
        fd.set("role", "USER");
        fd.set("newPassword", "");

        await expect(updateUser(fd)).rejects.toThrow("REDIRECT");
        const url = redirectMock.mock.calls[0]![0] as string;
        expect(decodeURIComponent(url)).toContain("Email is already in use");
    });

    it("updates user", async () => {
        mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
        mockUserFindUnique.mockResolvedValue({
            id: uid,
            userName: "x",
            role: "USER",
            studentProfile: { id: "sp1" },
            teacherProfile: null,
        });
        mockUserFindFirst.mockResolvedValue(null);

        const fd = new FormData();
        fd.set("id", uid);
        fd.set("firstName", "Ann");
        fd.set("lastName", "Bee");
        fd.set("email", "ann@example.com");
        fd.set("role", "USER");
        fd.set("isActive", "on");
        fd.set("newPassword", "");

        await expect(updateUser(fd)).rejects.toThrow("REDIRECT");
        expect(redirectMock).toHaveBeenCalledWith("/users");
        expect(mockTransaction).toHaveBeenCalled();
    });

    it("creates student profile when role is USER and profile missing", async () => {
        const studentProfileCreate = vi.fn().mockResolvedValue({});
        mockTransaction.mockImplementation(
            async (fn: (tx: {
                user: { update: ReturnType<typeof vi.fn> };
                studentProfile: { create: ReturnType<typeof vi.fn> };
                teacherProfile: { create: ReturnType<typeof vi.fn> };
            }) => Promise<unknown>) => {
                return fn({
                    user: {
                        update: vi.fn().mockResolvedValue({}),
                    },
                    studentProfile: {
                        create: studentProfileCreate,
                    },
                    teacherProfile: {
                        create: vi.fn().mockResolvedValue({}),
                    },
                });
            },
        );

        mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
        mockUserFindUnique.mockResolvedValue({
            id: uid,
            userName: "x",
            role: "TEACHER",
            studentProfile: null,
            teacherProfile: { id: "tp1" },
        });
        mockUserFindFirst.mockResolvedValue(null);

        const fd = new FormData();
        fd.set("id", uid);
        fd.set("firstName", "Ann");
        fd.set("lastName", "Bee");
        fd.set("email", "ann@example.com");
        fd.set("role", "USER");
        fd.set("isActive", "on");
        fd.set("newPassword", "");

        await expect(updateUser(fd)).rejects.toThrow("REDIRECT");
        expect(studentProfileCreate).toHaveBeenCalledWith({
            data: { userId: uid },
        });
    });

    it("creates teacher profile when role changes to TEACHER", async () => {
        const teacherProfileCreate = vi.fn().mockResolvedValue({});
        mockTransaction.mockImplementation(
            async (fn: (tx: {
                user: { update: ReturnType<typeof vi.fn> };
                studentProfile: { create: ReturnType<typeof vi.fn> };
                teacherProfile: { create: ReturnType<typeof vi.fn> };
            }) => Promise<unknown>) => {
                return fn({
                    user: {
                        update: vi.fn().mockResolvedValue({}),
                    },
                    studentProfile: {
                        create: vi.fn().mockResolvedValue({}),
                    },
                    teacherProfile: {
                        create: teacherProfileCreate,
                    },
                });
            },
        );

        mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
        mockUserFindUnique.mockResolvedValue({
            id: uid,
            userName: "x",
            role: "USER",
            studentProfile: { id: "sp1" },
            teacherProfile: null,
        });
        mockUserFindFirst.mockResolvedValue(null);

        const fd = new FormData();
        fd.set("id", uid);
        fd.set("firstName", "Ann");
        fd.set("lastName", "Bee");
        fd.set("email", "ann@example.com");
        fd.set("role", "TEACHER");
        fd.set("isActive", "on");
        fd.set("newPassword", "newpass123");

        await expect(updateUser(fd)).rejects.toThrow("REDIRECT");
        expect(teacherProfileCreate).toHaveBeenCalledWith({
            data: { userId: uid },
        });
    });
});
