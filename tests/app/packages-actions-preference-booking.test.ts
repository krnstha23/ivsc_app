import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockAuth = vi.fn();
const mockBundleFind = vi.fn();
const mockStudentFind = vi.fn();
const mockGenerateSlots = vi.fn();
const mockAssignTeacher = vi.fn();
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
        studentProfile: {
            findUnique: (...a: unknown[]) => mockStudentFind(...a),
        },
        booking: {
            findMany: vi.fn().mockResolvedValue([]),
        },
        availability: {
            create: vi.fn().mockResolvedValue({ id: "av1" }),
        },
        $transaction: (...a: unknown[]) => mockTransaction(...a),
    },
}));

vi.mock("@/lib/slot-generator", async (importOriginal) => {
    const actual =
        await importOriginal<typeof import("@/lib/slot-generator")>();
    return {
        ...actual,
        generateSlots: (...a: unknown[]) => mockGenerateSlots(...a),
        assignTeacher: (...a: unknown[]) => mockAssignTeacher(...a),
        computeLeadTimeCategory: vi
            .fn()
            .mockReturnValue("PRIORITY" as import("@/lib/slot-generator").LeadTimeCategory),
    };
});

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import {
    findSlotForPreference,
    createBookingForSlot,
} from "@/app/(app)/packages/actions";

const bundleId = "f6eebc99-9c0b-4ef8-bb6d-6bb9bd380a66";

describe("findSlotForPreference", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-07-10T10:00:00.000Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("requires sign-in", async () => {
        mockAuth.mockResolvedValue(null);
        const r = await findSlotForPreference(bundleId, "2026-07-15", "14:00");
        expect(r.found).toBe(false);
        if (!r.found) expect(r.message).toContain("signed in");
    });

    it("rejects bad date format", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1" } });
        const r = await findSlotForPreference(bundleId, "07-15-2026", "14:00");
        expect(r.found).toBe(false);
        if (!r.found) expect(r.message).toContain("Invalid date format");
    });

    it("rejects bad time format", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1" } });
        const r = await findSlotForPreference(bundleId, "2026-07-15", "2pm");
        expect(r.found).toBe(false);
        if (!r.found) expect(r.message).toContain("Invalid time format");
    });

    it("rejects inactive bundle", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1" } });
        mockBundleFind.mockResolvedValue({
            duration: 60,
            isActive: false,
            priceStandard: 10,
            pricePriority: 20,
            priceInstant: 30,
        });
        const r = await findSlotForPreference(bundleId, "2026-07-15", "14:00");
        expect(r.found).toBe(false);
    });

    it("rejects past date", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1" } });
        mockBundleFind.mockResolvedValue({
            duration: 60,
            isActive: true,
            priceStandard: 10,
            pricePriority: 20,
            priceInstant: 30,
        });
        const r = await findSlotForPreference(bundleId, "2026-07-01", "14:00");
        expect(r.found).toBe(false);
        if (!r.found) expect(r.message).toContain("past");
    });

    it("returns alternatives when requested date has no slots", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1" } });
        mockBundleFind.mockResolvedValue({
            duration: 60,
            isActive: true,
            priceStandard: 10,
            pricePriority: 20,
            priceInstant: 30,
        });
        mockGenerateSlots.mockImplementation((date: Date) => {
            const key = date.toISOString().slice(0, 10);
            if (key === "2026-07-15") {
                return Promise.resolve([]);
            }
            return Promise.resolve([
                {
                    startTime: "10:00",
                    endTime: "11:00",
                    teacherId: "t1",
                    availabilityId: "av1",
                },
            ]);
        });

        const r = await findSlotForPreference(
            bundleId,
            "2026-07-15",
            "14:00",
        );
        expect(r.found).toBe(false);
        if (!r.found) {
            expect(r.alternatives.length).toBeGreaterThan(0);
            expect(r.message).toContain("No available slots");
        }
    });

    it("returns best slot when available", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1" } });
        mockBundleFind.mockResolvedValue({
            duration: 60,
            isActive: true,
            priceStandard: 10,
            pricePriority: 20,
            priceInstant: 30,
        });
        mockGenerateSlots.mockResolvedValue([
            {
                startTime: "15:00",
                endTime: "16:00",
                teacherId: "t1",
                availabilityId: "av1",
            },
            {
                startTime: "18:00",
                endTime: "19:00",
                teacherId: "t1",
                availabilityId: "av2",
            },
        ]);

        const r = await findSlotForPreference(bundleId, "2026-07-15", "15:00");
        expect(r.found).toBe(true);
        if (r.found) {
            expect(r.slot.startTime).toBe("15:00");
            expect(r.isExactMatch).toBe(true);
        }
    });
});

describe("createBookingForSlot", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-01T10:00:00.000Z"));
        mockTransaction.mockImplementation(
            async (fn: (tx: {
                booking: {
                    findMany: ReturnType<typeof vi.fn>;
                    create: ReturnType<typeof vi.fn>;
                };
                availability: { create: ReturnType<typeof vi.fn> };
            }) => Promise<void>) => {
                const tx = {
                    booking: {
                        findMany: vi.fn().mockResolvedValue([]),
                        create: vi.fn().mockResolvedValue({ id: "b1" }),
                    },
                    availability: {
                        create: vi.fn().mockResolvedValue({ id: "av1" }),
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
        const r = await createBookingForSlot({
            bundleId,
            date: "2030-01-01",
            startTime: "12:00",
        });
        expect(r).toEqual({ success: false, error: "You must be signed in." });
    });

    it("rejects non-student", async () => {
        mockAuth.mockResolvedValue({ user: { id: "t1", role: "TEACHER" } });
        const r = await createBookingForSlot({
            bundleId,
            date: "2030-01-01",
            startTime: "12:00",
        });
        expect(r).toEqual({
            success: false,
            error: "Only students can book sessions.",
        });
    });

    it("rejects missing fields", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        const r = await createBookingForSlot({
            bundleId: "",
            date: "2030-01-01",
            startTime: "12:00",
        });
        expect(r).toEqual({
            success: false,
            error: "Missing required fields.",
        });
    });

    it("rejects inactive bundle", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBundleFind.mockResolvedValue({
            duration: 60,
            isActive: false,
            hasEvaluation: false,
        });
        const r = await createBookingForSlot({
            bundleId,
            date: "2030-01-01",
            startTime: "12:00",
        });
        expect(r).toEqual({
            success: false,
            error: "Bundle not found or inactive.",
        });
    });

    it("rejects without student profile", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBundleFind.mockResolvedValue({
            duration: 60,
            isActive: true,
            hasEvaluation: false,
        });
        mockStudentFind.mockResolvedValue(null);
        const r = await createBookingForSlot({
            bundleId,
            date: "2030-01-01",
            startTime: "12:00",
        });
        expect(r).toEqual({
            success: false,
            error: "Student profile not found.",
        });
    });

    it("rejects when slot missing from regenerated availability", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBundleFind.mockResolvedValue({
            duration: 60,
            isActive: true,
            hasEvaluation: false,
        });
        mockStudentFind.mockResolvedValue({ id: "sp1" });
        mockGenerateSlots.mockResolvedValue([]);

        const r = await createBookingForSlot({
            bundleId,
            date: "2030-01-01",
            startTime: "12:00",
        });
        expect(r.success).toBe(false);
        if (!r.success) {
            expect(r.error).toContain("no longer available");
        }
    });

    it("rejects booking in the past", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBundleFind.mockResolvedValue({
            duration: 60,
            isActive: true,
            hasEvaluation: false,
        });
        mockStudentFind.mockResolvedValue({ id: "sp1" });
        mockGenerateSlots.mockResolvedValue([
            {
                startTime: "08:00",
                endTime: "09:00",
                teacherId: "t1",
                availabilityId: "a1",
            },
        ]);
        mockAssignTeacher.mockResolvedValue("t1");

        const r = await createBookingForSlot({
            bundleId,
            date: "2026-08-01",
            startTime: "08:00",
        });
        expect(r.success).toBe(false);
        if (!r.success) {
            expect(r.error).toContain("past");
        }
    });

    it("creates pending booking", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBundleFind.mockResolvedValue({
            duration: 60,
            isActive: true,
            hasEvaluation: true,
        });
        mockStudentFind.mockResolvedValue({ id: "sp1" });
        mockGenerateSlots.mockResolvedValue([
            {
                startTime: "16:00",
                endTime: "17:00",
                teacherId: "t1",
                availabilityId: "a1",
            },
        ]);
        mockAssignTeacher.mockResolvedValue("t1");

        const r = await createBookingForSlot({
            bundleId,
            date: "2030-06-15",
            startTime: "16:00",
        });
        expect(r).toEqual({ success: true });
    });

    it("maps slot conflict to friendly error", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBundleFind.mockResolvedValue({
            duration: 60,
            isActive: true,
            hasEvaluation: false,
        });
        mockStudentFind.mockResolvedValue({ id: "sp1" });
        mockGenerateSlots.mockResolvedValue([
            {
                startTime: "16:00",
                endTime: "17:00",
                teacherId: "t1",
                availabilityId: "a1",
            },
        ]);
        mockAssignTeacher.mockResolvedValue("t1");
        mockTransaction.mockImplementation(async () => {
            throw new Error("SLOT_TAKEN");
        });

        const r = await createBookingForSlot({
            bundleId,
            date: "2030-06-15",
            startTime: "16:00",
        });
        expect(r.success).toBe(false);
        if (!r.success) {
            expect(r.error).toContain("just taken");
        }
    });
});
