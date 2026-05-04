import { describe, expect, it, vi, beforeEach } from "vitest";
import { Role } from "@/app/generated/prisma/enums";

const mockUserFindUnique = vi.fn();
const mockVerifyPassword = vi.fn();
const mockNextAuthAuth = vi.hoisted(() =>
    vi.fn().mockResolvedValue({ user: { id: "session-u" } }),
);

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: {
            findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
        },
    },
}));

vi.mock("@/lib/passwords", () => ({
    verifyPassword: (...a: unknown[]) => mockVerifyPassword(...a),
}));

vi.mock("react", () => ({
    cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
}));

/** Config object passed to NextAuth(...) when `@/lib/auth` loads. */
let capturedNextAuthConfig: {
    callbacks?: {
        jwt?: (args: {
            token: Record<string, unknown>;
            user?: Record<string, unknown>;
        }) => Promise<Record<string, unknown>>;
        session?: (args: {
            session: { user?: Record<string, unknown> };
            token: Record<string, unknown>;
        }) => { user?: Record<string, unknown> };
    };
    providers?: Array<{ options?: { authorize?: (c: unknown) => Promise<unknown> } }>;
};

vi.mock("next-auth", () => {
    class MockCredentialsSignin extends Error {
        code = "credentials";
    }
    return {
        CredentialsSignin: MockCredentialsSignin,
        default: vi.fn((config: typeof capturedNextAuthConfig) => {
            capturedNextAuthConfig = config;
            return {
                auth: mockNextAuthAuth,
                handlers: {},
                signIn: vi.fn(),
                signOut: vi.fn(),
            };
        }),
    };
});

vi.mock("next-auth/providers/credentials", () => ({
    default: vi.fn((opts: { authorize?: (c: unknown) => Promise<unknown> }) => ({
        id: "credentials",
        type: "credentials",
        options: opts,
    })),
}));

describe("lib/auth NextAuth integration", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        mockUserFindUnique.mockReset();
        mockVerifyPassword.mockReset();
        mockNextAuthAuth.mockImplementation(() =>
            Promise.resolve({ user: { id: "session-u" } }),
        );
    });

    it("jwt stores user fields on first sign-in", async () => {
        await import("@/lib/auth");
        const jwt = capturedNextAuthConfig.callbacks?.jwt;
        expect(jwt).toBeDefined();

        const token = await jwt!({
            token: {},
            user: { id: "u1", role: Role.USER, username: "alice" },
        });
        expect(token.id).toBe("u1");
        expect(token.role).toBe(Role.USER);
        expect(token.username).toBe("alice");
        expect((token as { lastUserCheckAt?: number }).lastUserCheckAt).toBeTypeOf(
            "number",
        );
    });

    it("jwt returns early when token data is fresh", async () => {
        await import("@/lib/auth");
        const jwt = capturedNextAuthConfig.callbacks!.jwt!;
        const now = Date.now();
        const tokenIn = {
            id: "u1",
            role: Role.USER,
            username: "alice",
            lastUserCheckAt: now,
        };
        const out = await jwt({ token: { ...tokenIn }, user: undefined });
        expect(out).toEqual(tokenIn);
        expect(mockUserFindUnique).not.toHaveBeenCalled();
    });

    it("jwt clears token when user inactive", async () => {
        await import("@/lib/auth");
        mockUserFindUnique.mockResolvedValue({
            id: "u1",
            userName: "alice",
            role: Role.USER,
            isActive: false,
            teacherProfile: null,
        });

        const jwt = capturedNextAuthConfig.callbacks!.jwt!;
        const out = await jwt({
            token: { id: "u1" },
            user: undefined,
        });
        expect(out.id).toBeUndefined();
        expect(out.role).toBeUndefined();
    });

    it("jwt clears token when teacher not approved", async () => {
        await import("@/lib/auth");
        mockUserFindUnique.mockResolvedValue({
            id: "u1",
            userName: "t1",
            role: Role.TEACHER,
            isActive: true,
            teacherProfile: { isApproved: false },
        });

        const jwt = capturedNextAuthConfig.callbacks!.jwt!;
        const out = await jwt({
            token: { id: "u1" },
            user: undefined,
        });
        expect(out.id).toBeUndefined();
    });

    it("jwt returns token unchanged when id missing", async () => {
        await import("@/lib/auth");
        const jwt = capturedNextAuthConfig.callbacks!.jwt!;
        const token = { role: Role.USER };
        const out = await jwt({ token, user: undefined });
        expect(out).toBe(token);
    });

    it("jwt refreshes role from database when stale", async () => {
        await import("@/lib/auth");
        mockUserFindUnique.mockResolvedValue({
            id: "u1",
            userName: "bob",
            role: Role.USER,
            isActive: true,
            teacherProfile: null,
        });

        const jwt = capturedNextAuthConfig.callbacks!.jwt!;
        const old = Date.now() - 10 * 60 * 1000;
        const out = await jwt({
            token: {
                id: "u1",
                role: "stale",
                username: "old",
                lastUserCheckAt: old,
            },
            user: undefined,
        });
        expect(out.role).toBe(Role.USER);
        expect(out.username).toBe("bob");
    });

    it("session clears user when token has no id", async () => {
        await import("@/lib/auth");
        const sessionCb = capturedNextAuthConfig.callbacks!.session!;
        const out = sessionCb({
            session: { user: { name: "x" } },
            token: {},
        });
        expect(out.user).toBeUndefined();
    });

    it("session maps token onto session.user", async () => {
        await import("@/lib/auth");
        const sessionCb = capturedNextAuthConfig.callbacks!.session!;
        const out = sessionCb({
            session: { user: {} },
            token: {
                id: "u1",
                role: Role.ADMIN,
                username: "admin",
            },
        });
        expect((out.user as { id?: string }).id).toBe("u1");
        expect((out.user as { role?: string }).role).toBe(Role.ADMIN);
    });

    it("authorize returns null when user has no password hash", async () => {
        await import("@/lib/auth");
        mockUserFindUnique.mockResolvedValue({
            id: "u1",
            userName: "x",
            email: "x@y.com",
            firstName: "A",
            middleName: null,
            lastName: "B",
            passwordHash: null,
            isActive: true,
            role: Role.USER,
            teacherProfile: null,
        });
        const authorize =
            capturedNextAuthConfig.providers![0]!.options!.authorize!;
        await expect(
            authorize({ username: "x", password: "secret12" }),
        ).resolves.toBeNull();
    });

    it("authorize returns null for missing credentials", async () => {
        await import("@/lib/auth");
        const authorize =
            capturedNextAuthConfig.providers![0]!.options!.authorize!;
        await expect(authorize({})).resolves.toBeNull();
    });

    it("authorize returns user when password valid", async () => {
        await import("@/lib/auth");
        mockUserFindUnique.mockResolvedValue({
            id: "u1",
            userName: "alice",
            email: "a@b.com",
            firstName: "A",
            middleName: null,
            lastName: "L",
            passwordHash: "hash",
            isActive: true,
            role: Role.USER,
            teacherProfile: null,
        });
        mockVerifyPassword.mockResolvedValue(true);

        const authorize =
            capturedNextAuthConfig.providers![0]!.options!.authorize!;
        const user = await authorize({
            username: "alice",
            password: "secret12",
        });
        expect(user).toMatchObject({
            id: "u1",
            role: Role.USER,
        });
    });

    it("authorize returns null when user inactive", async () => {
        await import("@/lib/auth");
        mockUserFindUnique.mockResolvedValue({
            id: "u1",
            userName: "x",
            email: "x@y.com",
            firstName: "A",
            middleName: null,
            lastName: "B",
            passwordHash: "hash",
            isActive: false,
            role: Role.USER,
            teacherProfile: null,
        });

        const authorize =
            capturedNextAuthConfig.providers![0]!.options!.authorize!;
        await expect(
            authorize({ username: "x", password: "secret12" }),
        ).resolves.toBeNull();
    });

    it("authorize returns null when password invalid", async () => {
        await import("@/lib/auth");
        mockUserFindUnique.mockResolvedValue({
            id: "u1",
            userName: "x",
            email: "x@y.com",
            firstName: "A",
            middleName: null,
            lastName: "B",
            passwordHash: "hash",
            isActive: true,
            role: Role.USER,
            teacherProfile: null,
        });
        mockVerifyPassword.mockResolvedValue(false);

        const authorize =
            capturedNextAuthConfig.providers![0]!.options!.authorize!;
        await expect(
            authorize({ username: "x", password: "wrong" }),
        ).resolves.toBeNull();
    });

    it("cached auth uses NextAuth session", async () => {
        const { auth } = await import("@/lib/auth");
        mockNextAuthAuth.mockResolvedValue({
            user: { id: "uid1", name: "Test" },
        });
        const session = await auth();
        expect(mockNextAuthAuth).toHaveBeenCalled();
        expect(session?.user).toBeDefined();
    });

    it("cached auth returns null when session has no user id", async () => {
        vi.resetModules();
        mockNextAuthAuth.mockResolvedValue({ user: {} });
        const { auth } = await import("@/lib/auth");
        await expect(auth()).resolves.toBeNull();
    });

    it("authorize throws when teacher not approved", async () => {
        await import("@/lib/auth");
        mockUserFindUnique.mockResolvedValue({
            id: "t1",
            userName: "teach",
            email: "t@b.com",
            firstName: "T",
            middleName: null,
            lastName: "E",
            passwordHash: "hash",
            isActive: true,
            role: Role.TEACHER,
            teacherProfile: { isApproved: false },
        });
        mockVerifyPassword.mockResolvedValue(true);

        const authorize =
            capturedNextAuthConfig.providers![0]!.options!.authorize!;
        await expect(
            authorize({ username: "teach", password: "secret12" }),
        ).rejects.toBeDefined();
    });
});
