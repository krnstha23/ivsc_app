import { describe, expect, it, vi, beforeEach } from "vitest";

const sendBookingConfirmedEmail = vi.fn();

vi.mock("@/lib/booking-mail", async (importOriginal) => {
    const mod = await importOriginal<typeof import("@/lib/booking-mail")>();
    return {
        ...mod,
        sendBookingConfirmedEmail: (
            ...args: Parameters<typeof mod.sendBookingConfirmedEmail>
        ) => sendBookingConfirmedEmail(...args),
    };
});

const mockFindUnique = vi.fn();
const mockPackageBundleFindUnique = vi.fn();
const mockCreateLog = vi.fn();

vi.mock("@/lib/prisma", () => ({
    prisma: {
        booking: { findUnique: (...a: unknown[]) => mockFindUnique(...a) },
        packageBundle: {
            findUnique: (...a: unknown[]) => mockPackageBundleFindUnique(...a),
        },
        emailSendLog: { create: (...a: unknown[]) => mockCreateLog(...a) },
    },
}));

import { dispatchBookingConfirmationEmail } from "@/lib/dispatch-booking-confirmation-email";
import { EmailSendStatus, EmailSendTrigger } from "@/app/generated/prisma/enums";

describe("dispatchBookingConfirmationEmail", () => {
    const bookingId = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";

    const baseBooking = {
        id: bookingId,
        userId: "user-1",
        status: "CONFIRMED" as const,
        studentEmail: "stu@example.com" as string | null,
        scheduledAt: new Date("2026-08-01T10:00:00.000Z"),
        duration: 60,
        meetLink: null as string | null,
        packageId: "p1" as string | null,
        bundleId: null as string | null,
        user: {
            email: "u@example.com",
            firstName: "S",
            middleName: null as string | null,
            lastName: "Student",
        },
        teacher: {
            user: {
                firstName: "T",
                middleName: null as string | null,
                lastName: "Teacher",
            },
        },
        package: { name: "Speaking Pack" } as { name: string } | null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        sendBookingConfirmedEmail.mockResolvedValue({ ok: true });
    });

    it("no-ops when booking is missing", async () => {
        mockFindUnique.mockResolvedValue(null);
        await dispatchBookingConfirmationEmail(bookingId, {
            trigger: "BOOKING_CONFIRM",
            triggeredByUserId: null,
        });
        expect(mockCreateLog).not.toHaveBeenCalled();
        expect(sendBookingConfirmedEmail).not.toHaveBeenCalled();
    });

    it("no-ops when booking is not CONFIRMED", async () => {
        mockFindUnique.mockResolvedValue({ ...baseBooking, status: "PENDING" });
        await dispatchBookingConfirmationEmail(bookingId, {
            trigger: "BOOKING_CONFIRM",
            triggeredByUserId: null,
        });
        expect(sendBookingConfirmedEmail).not.toHaveBeenCalled();
    });

    it("logs FAILED with (none) when no recipient", async () => {
        mockFindUnique.mockResolvedValue({
            ...baseBooking,
            studentEmail: null,
            user: { ...baseBooking.user, email: "" },
        });
        await dispatchBookingConfirmationEmail(bookingId, {
            trigger: "BOOKING_CONFIRM",
            triggeredByUserId: "admin1",
        });
        expect(sendBookingConfirmedEmail).not.toHaveBeenCalled();
        expect(mockCreateLog).toHaveBeenCalledWith({
            data: expect.objectContaining({
                toEmail: "(none)",
                status: EmailSendStatus.FAILED,
                trigger: EmailSendTrigger.BOOKING_CONFIRM,
                triggeredByUserId: "admin1",
            }),
        });
    });

    it("logs SENT when mail succeeds", async () => {
        mockFindUnique.mockResolvedValue(baseBooking);
        await dispatchBookingConfirmationEmail(bookingId, {
            trigger: "ADMIN_RESEND",
            triggeredByUserId: "adm",
        });
        expect(sendBookingConfirmedEmail).toHaveBeenCalled();
        expect(mockCreateLog).toHaveBeenCalledWith({
            data: expect.objectContaining({
                toEmail: "stu@example.com",
                status: EmailSendStatus.SENT,
                trigger: EmailSendTrigger.ADMIN_RESEND,
                triggeredByUserId: "adm",
            }),
        });
    });

    it("logs FAILED when mail returns ok false", async () => {
        mockFindUnique.mockResolvedValue(baseBooking);
        sendBookingConfirmedEmail.mockResolvedValue({
            ok: false,
            error: "SMTP down",
        });
        await dispatchBookingConfirmationEmail(bookingId, {
            trigger: "BOOKING_CONFIRM",
            triggeredByUserId: null,
        });
        expect(mockCreateLog).toHaveBeenCalledWith({
            data: expect.objectContaining({
                status: EmailSendStatus.FAILED,
                errorMessage: "SMTP down",
            }),
        });
    });

    it("resolves bundle name when package name absent", async () => {
        mockFindUnique.mockResolvedValue({
            ...baseBooking,
            package: null,
            packageId: null,
            bundleId: "bundle-1",
        });
        mockPackageBundleFindUnique.mockResolvedValue({ name: "Gold Bundle" });
        sendBookingConfirmedEmail.mockResolvedValue({ ok: true });
        await dispatchBookingConfirmationEmail(bookingId, {
            trigger: "BOOKING_CONFIRM",
            triggeredByUserId: null,
        });
        expect(mockPackageBundleFindUnique).toHaveBeenCalledWith({
            where: { id: "bundle-1" },
            select: { name: true },
        });
        expect(sendBookingConfirmedEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                packageOrBundleLabel: "Gold Bundle",
            }),
        );
    });
});
