import { describe, expect, it, vi } from "vitest";

const sendMail = vi.fn().mockResolvedValue({ messageId: "id" });
vi.mock("nodemailer", () => ({
    default: {
        createTransport: vi.fn(() => ({ sendMail })),
    },
}));

describe("sendBookingConfirmedEmail with mocked SMTP", () => {
    it("invokes sendMail when SMTP env is present", async () => {
        process.env.SMTP_HOST = "smtp.example.com";
        process.env.MAIL_FROM = "App <noreply@example.com>";
        process.env.SMTP_PORT = "587";
        sendMail.mockClear();
        const { sendBookingConfirmedEmail } = await import("@/lib/booking-mail");
        const r = await sendBookingConfirmedEmail({
            to: "student@example.com",
            studentDisplayName: "Sam",
            scheduledAt: new Date("2026-06-01T10:00:00.000Z"),
            durationMinutes: 60,
            teacherDisplayName: "Terry",
            packageOrBundleLabel: "Bundle X",
            meetLink: null,
        });
        expect(r.ok).toBe(true);
        expect(sendMail).toHaveBeenCalled();
        const mail = sendMail.mock.calls[0]![0] as {
            to: string;
            subject: string;
        };
        expect(mail.to).toBe("student@example.com");
        expect(mail.subject).toBe("Your Score Mirror booking is confirmed");
    });
});
