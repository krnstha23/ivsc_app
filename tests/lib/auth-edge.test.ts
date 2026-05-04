import { describe, expect, it, vi, beforeEach } from "vitest";

const authFn = vi.fn().mockResolvedValue(null);

vi.mock("next-auth", () => ({
    default: vi.fn(() => ({
        auth: authFn,
    })),
}));

vi.mock("next-auth/providers/credentials", () => ({
    default: vi.fn(() => ({ type: "credentials" })),
}));

describe("auth-edge", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authFn.mockResolvedValue(null);
    });

    it("exports auth that delegates to the edge NextAuth instance", async () => {
        const { auth } = await import("@/lib/auth-edge");
        await expect(auth()).resolves.toBeNull();
        expect(authFn).toHaveBeenCalledTimes(1);
    });
});
