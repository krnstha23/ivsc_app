import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockBookingFindUnique = vi.fn();
const mockTeacherFindUnique = vi.fn();
const mockGenerateSlots = vi.fn();
const mockAssignTeacher = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/auth", () => ({
    auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        booking: {
            findUnique: (...a: unknown[]) => mockBookingFindUnique(...a),
            findMany: vi.fn().mockResolvedValue([]),
            delete: vi.fn(),
            create: vi.fn(),
        },
        teacherProfile: {
            findUnique: (...a: unknown[]) => mockTeacherFindUnique(...a),
        },
        availability: {
            create: vi.fn().mockResolvedValue({ id: "new-av" }),
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
    };
});

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import { rescheduleToSlot } from "@/app/(app)/packages/actions";

const bid = "c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";
const bundleId = "d4eebc99-9c0b-4ef8-bb6d-6bb9bd380a44";

describe("rescheduleToSlot", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
            fn({
                booking: {
                    findMany: vi.fn().mockResolvedValue([]),
                    delete: vi.fn(),
                    create: vi.fn(),
                },
                availability: {
                    create: vi.fn().mockResolvedValue({ id: "av1" }),
                },
            }),
        );
    });

    it("rejects when not signed in", async () => {
        mockAuth.mockResolvedValue(null);
        const r = await rescheduleToSlot({
            bookingId: bid,
            date: "2030-01-15",
            startTime: "10:00",
        });
        expect(r).toEqual({ success: false, error: "You must be signed in." });
    });

    it("rejects when booking not found", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBookingFindUnique.mockResolvedValue(null);
        const r = await rescheduleToSlot({
            bookingId: bid,
            date: "2030-01-15",
            startTime: "10:00",
        });
        expect(r).toEqual({ success: false, error: "Booking not found." });
    });

    it("rejects cancelled booking", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBookingFindUnique.mockResolvedValue({
            id: bid,
            userId: "u1",
            teacherId: "t1",
            packageId: null,
            bundleId,
            duration: 60,
            status: "CANCELLED",
            availabilityId: "a1",
        });
        const r = await rescheduleToSlot({
            bookingId: bid,
            date: "2030-01-15",
            startTime: "10:00",
        });
        expect(r.success).toBe(false);
        if (!r.success) {
            expect(r.error).toContain("cancelled");
        }
    });

    it("rejects pending booking", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBookingFindUnique.mockResolvedValue({
            id: bid,
            userId: "u1",
            teacherId: "t1",
            packageId: null,
            bundleId,
            duration: 60,
            status: "PENDING",
            availabilityId: "a1",
        });
        const r = await rescheduleToSlot({
            bookingId: bid,
            date: "2030-01-15",
            startTime: "10:00",
        });
        expect(r.success).toBe(false);
    });

    it("rejects when student tries non-confirmed", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBookingFindUnique.mockResolvedValue({
            id: bid,
            userId: "u1",
            teacherId: "t1",
            packageId: null,
            bundleId,
            duration: 60,
            status: "COMPLETED",
            availabilityId: "a1",
        });
        const r = await rescheduleToSlot({
            bookingId: bid,
            date: "2030-01-15",
            startTime: "10:00",
        });
        expect(r.success).toBe(false);
    });

    it("rejects when cannot manage booking", async () => {
        mockAuth.mockResolvedValue({ user: { id: "other", role: "USER" } });
        mockBookingFindUnique.mockResolvedValue({
            id: bid,
            userId: "u1",
            teacherId: "t1",
            packageId: null,
            bundleId: null,
            duration: 60,
            status: "CONFIRMED",
            availabilityId: "a1",
        });
        const r = await rescheduleToSlot({
            bookingId: bid,
            date: "2030-01-15",
            startTime: "10:00",
        });
        expect(r).toEqual({
            success: false,
            error: "You cannot reschedule this booking.",
        });
    });

    it("rejects when bundle slot no longer matches", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBookingFindUnique.mockResolvedValue({
            id: bid,
            userId: "u1",
            teacherId: "t1",
            packageId: null,
            bundleId,
            duration: 60,
            status: "CONFIRMED",
            availabilityId: "a1",
        });
        mockGenerateSlots.mockResolvedValue([
            { startTime: "11:00", endTime: "12:00", teacherId: "t1" },
        ]);

        const r = await rescheduleToSlot({
            bookingId: bid,
            date: "2030-01-15",
            startTime: "10:00",
        });
        expect(r).toEqual({
            success: false,
            error: "This slot is no longer available.",
        });
    });

    it("completes reschedule for package booking without bundle", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBookingFindUnique.mockResolvedValue({
            id: bid,
            userId: "u1",
            teacherId: "t1",
            packageId: "pkg1",
            bundleId: null,
            duration: 60,
            status: "CONFIRMED",
            availabilityId: "a1",
        });

        const r = await rescheduleToSlot({
            bookingId: bid,
            date: "2030-06-20",
            startTime: "14:00",
        });
        expect(r).toEqual({ success: true });
        expect(mockTransaction).toHaveBeenCalled();
    });

    it("returns conflict message when slot overlaps existing booking", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBookingFindUnique.mockResolvedValue({
            id: bid,
            userId: "u1",
            teacherId: "t1",
            packageId: null,
            bundleId: null,
            duration: 60,
            status: "CONFIRMED",
            availabilityId: "a1",
        });
        mockTransaction.mockImplementation(async (fn: (tx: {
            booking: {
                findMany: ReturnType<typeof vi.fn>;
                delete: ReturnType<typeof vi.fn>;
                create: ReturnType<typeof vi.fn>;
            };
            availability: { create: ReturnType<typeof vi.fn> };
        }) => Promise<void>) => {
            const tx = {
                booking: {
                    findMany: vi
                        .fn()
                        .mockResolvedValue([
                            {
                                scheduledAt: new Date(
                                    "2030-06-20T14:00:00.000Z",
                                ),
                                duration: 120,
                            },
                        ]),
                    delete: vi.fn(),
                    create: vi.fn(),
                },
                availability: {
                    create: vi.fn().mockResolvedValue({ id: "av1" }),
                },
            };
            return fn(tx);
        });

        const r = await rescheduleToSlot({
            bookingId: bid,
            date: "2030-06-20",
            startTime: "14:00",
        });
        expect(r).toEqual({
            success: false,
            error: "This slot was just taken. Please try another time.",
        });
    });

    it("uses generateSlots + assignTeacher for bundle booking", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
        mockBookingFindUnique.mockResolvedValue({
            id: bid,
            userId: "u1",
            teacherId: "t1",
            packageId: null,
            bundleId,
            duration: 60,
            status: "CONFIRMED",
            availabilityId: "a1",
        });
        mockGenerateSlots.mockResolvedValue([
            {
                startTime: "10:00",
                endTime: "11:00",
                teacherId: "tp99",
            },
        ]);
        mockAssignTeacher.mockResolvedValue("tp99");

        const r = await rescheduleToSlot({
            bookingId: bid,
            date: "2030-06-20",
            startTime: "10:00",
        });
        expect(r).toEqual({ success: true });
        expect(mockAssignTeacher).toHaveBeenCalled();
    });
});
