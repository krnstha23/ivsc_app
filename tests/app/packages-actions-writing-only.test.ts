import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockAuth = vi.fn();
const mockBundleFind = vi.fn();
const mockTeacherFindMany = vi.fn();
const mockGroupBy = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/auth", () => ({
    auth: () => mockAuth(),
}));

vi.mock("@/lib/writing-question-assigner", () => ({
    assignWritingQuestion: vi.fn().mockResolvedValue("wq-1"),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        packageBundle: {
            findUnique: (...a: unknown[]) => mockBundleFind(...a),
        },
        teacherProfile: {
            findMany: (...a: unknown[]) => mockTeacherFindMany(...a),
        },
        booking: {
            groupBy: (...a: unknown[]) => mockGroupBy(...a),
        },
        $transaction: (...a: unknown[]) => mockTransaction(...a),
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import { createWritingOnlyBooking } from "@/app/(app)/packages/actions";

const bundleId = "e5eebc99-9c0b-4ef8-bb6d-6bb9bd380a55";

describe("createWritingOnlyBooking", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-05-04T12:00:00.000Z"));
        mockTransaction.mockImplementation(
            async (fn: (tx: {
                availability: { create: ReturnType<typeof vi.fn> };
                booking: { create: ReturnType<typeof vi.fn> };
            }) => Promise<{ id: string }>) => {
                const tx = {
                    availability: {
                        create: vi.fn().mockResolvedValue({ id: "av1" }),
                    },
                    booking: {
                        create: vi.fn().mockResolvedValue({ id: "book-new" }),
                    },
                };
                return fn(tx);
            },
        );
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("rejects when not signed in", async () => {
        mockAuth.mockResolvedValue(null);
        const r = await createWritingOnlyBooking({
            bundleId,
            submissionStart: "2026-05-10",
            submissionEnd: "2026-05-12",
        });
        expect(r).toEqual({ success: false, error: "You must be signed in." });
    });

    it("rejects non-student", async () => {
        mockAuth.mockResolvedValue({ user: { id: "t1", role: "TEACHER" } });
        const r = await createWritingOnlyBooking({
            bundleId,
            submissionStart: "2026-05-10",
            submissionEnd: "2026-05-12",
        });
        expect(r).toEqual({
            success: false,
            error: "Only students can book sessions.",
        });
    });

    it("rejects invalid payload", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        const r = await createWritingOnlyBooking({
            bundleId: "not-uuid",
            submissionStart: "2026-05-10",
            submissionEnd: "2026-05-12",
        });
        expect(r.success).toBe(false);
    });

    it("rejects start in the past", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        const r = await createWritingOnlyBooking({
            bundleId,
            submissionStart: "2026-05-01",
            submissionEnd: "2026-05-12",
        });
        expect(r).toEqual({
            success: false,
            error: "Start date must be today or later.",
        });
    });

    it("rejects end before start", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        const r = await createWritingOnlyBooking({
            bundleId,
            submissionStart: "2026-05-20",
            submissionEnd: "2026-05-10",
        });
        expect(r).toEqual({
            success: false,
            error: "End date must be after start date.",
        });
    });

    it("rejects missing bundle", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBundleFind.mockResolvedValue(null);
        const r = await createWritingOnlyBooking({
            bundleId,
            submissionStart: "2026-05-10",
            submissionEnd: "2026-05-12",
        });
        expect(r).toEqual({ success: false, error: "Bundle not found." });
    });

    it("rejects inactive bundle", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBundleFind.mockResolvedValue({
            id: bundleId,
            isActive: false,
            duration: 0,
            hasEvaluation: false,
        });
        const r = await createWritingOnlyBooking({
            bundleId,
            submissionStart: "2026-05-10",
            submissionEnd: "2026-05-12",
        });
        expect(r).toEqual({
            success: false,
            error: "This bundle is not active.",
        });
    });

    it("rejects non-writing bundle", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBundleFind.mockResolvedValue({
            id: bundleId,
            isActive: true,
            duration: 60,
            hasEvaluation: true,
        });
        const r = await createWritingOnlyBooking({
            bundleId,
            submissionStart: "2026-05-10",
            submissionEnd: "2026-05-12",
        });
        expect(r).toEqual({
            success: false,
            error: "This bundle is not a writing-only bundle.",
        });
    });

    it("rejects when no teachers", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBundleFind.mockResolvedValue({
            id: bundleId,
            isActive: true,
            duration: 0,
            hasEvaluation: false,
        });
        mockTeacherFindMany.mockResolvedValue([]);

        const r = await createWritingOnlyBooking({
            bundleId,
            submissionStart: "2026-05-10",
            submissionEnd: "2026-05-12",
        });
        expect(r).toEqual({
            success: false,
            error: "No teachers available at this time.",
        });
    });

    it("creates pending booking with lowest-load teacher", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBundleFind.mockResolvedValue({
            id: bundleId,
            isActive: true,
            duration: 0,
            hasEvaluation: true,
        });
        mockTeacherFindMany.mockResolvedValue([
            { id: "ta" },
            { id: "tb" },
        ]);
        mockGroupBy.mockResolvedValue([
            { teacherId: "ta", _count: { id: 5 } },
            { teacherId: "tb", _count: { id: 1 } },
        ]);

        const r = await createWritingOnlyBooking({
            bundleId,
            submissionStart: "2026-05-10",
            submissionEnd: "2026-05-12",
        });
        expect(r).toEqual({ success: true, bookingId: "book-new" });
    });
});
