import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockBundleUpdate = vi.fn();

vi.mock("@/lib/auth", () => ({
    auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        packageBundle: {
            update: (...a: unknown[]) => mockBundleUpdate(...a),
        },
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import { updatePackageBundle } from "@/app/(app)/packages/actions";

const pid = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const pkgA = "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

describe("updatePackageBundle", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects non-admin", async () => {
        mockAuth.mockResolvedValue({ user: { role: "USER" } });
        const r = await updatePackageBundle({
            bundleId: pid,
            isActive: true,
            packageIds: [pkgA],
        });
        expect(r).toEqual({ success: false, error: "Not authorized." });
    });

    it("dedupes package ids and updates", async () => {
        mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
        mockBundleUpdate.mockResolvedValue({});

        const r = await updatePackageBundle({
            bundleId: pid,
            isActive: false,
            packageIds: [pkgA, pkgA],
        });
        expect(r).toEqual({ success: true });
        expect(mockBundleUpdate).toHaveBeenCalledWith({
            where: { id: pid },
            data: {
                isActive: false,
                packageIds: [pkgA],
            },
        });
    });
});
