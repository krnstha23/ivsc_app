import { describe, expect, it, vi } from "vitest";

describe("sendBookingConfirmedEmail without SMTP env", () => {
    it("returns structured failure (does not throw)", async () => {
        vi.resetModules();
        const prev = { ...process.env };
        delete process.env.SMTP_HOST;
        delete process.env.MAIL_FROM;
        const { sendBookingConfirmedEmail } = await import("@/lib/booking-mail");
        const r = await sendBookingConfirmedEmail({
            to: "student@example.com",
            studentDisplayName: "Sam",
            scheduledAt: new Date("2026-06-01T10:00:00.000Z"),
            durationMinutes: 60,
            teacherDisplayName: "Terry",
            packageOrBundleLabel: "IELTS Bundle",
            meetLink: null,
        });
        expect(r.ok).toBe(false);
        if (!r.ok) {
            expect(r.error.length).toBeGreaterThan(0);
        }
        process.env.SMTP_HOST = prev.SMTP_HOST;
        process.env.MAIL_FROM = prev.MAIL_FROM;
    });
});
