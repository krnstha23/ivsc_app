import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export type BookingConfirmationMailPayload = {
    to: string;
    studentDisplayName: string;
    scheduledAt: Date;
    durationMinutes: number;
    teacherDisplayName: string;
    packageOrBundleLabel: string;
    meetLink: string | null;
};

export type SendMailResult = { ok: true } | { ok: false; error: string };

function isSmtpConfigured(): boolean {
    return Boolean(process.env.SMTP_HOST?.trim() && process.env.MAIL_FROM?.trim());
}

let cachedTransport: Transporter | null = null;

function getTransport(): Transporter {
    if (!cachedTransport) {
        const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10);
        const secure = process.env.SMTP_SECURE === "true";
        const user = process.env.SMTP_USER?.trim();
        const pass = process.env.SMTP_PASSWORD;
        cachedTransport = nodemailer.createTransport({
            host: process.env.SMTP_HOST!.trim(),
            port,
            secure,
            auth:
                user && pass !== undefined && pass !== ""
                    ? { user, pass }
                    : undefined,
        });
    }
    return cachedTransport;
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function formatSessionWhen(d: Date): string {
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kathmandu",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(d);
}

const BOOKING_CONFIRM_SUBJECT = "Your Score Mirror booking is confirmed";
const SITE_ORIGIN = "https://scoremirror.com.np";
const CANCELLATION_POLICY_URL = `${SITE_ORIGIN}/cancellation-and-refund-policy`;

function buildPlainText(p: BookingConfirmationMailPayload): string {
    const meetBullet = p.meetLink?.trim()
        ? `• Meeting link (Google Meet): ${p.meetLink.trim()}\n`
        : "";

    return `Dear ${p.studentDisplayName},

Thank you for booking your evaluation.

Session details:
• Go to: ${SITE_ORIGIN} > login > bookings — your booking is listed there.
• Date & time (Nepal time): ${formatSessionWhen(p.scheduledAt)}

What happens next:
• Join on time via Google Meet
${meetBullet}• Speaking test: 11–14 minutes
• Premium: recording + report + verbal Q&A

You must:
• Be alone in a quiet room. Camera on. Microphone on.
• Use a laptop. Test your equipment before joining.
• Keep your passport/ID nearby.
• Sit upright, facing the camera.
• Turn off all other devices (ringers, vibrations).

You must not:
• Take the test from bed, public space, or vehicle.
• Have another person in the room.
• Use notes, other screens, or devices.
• Eat, drink, or interrupt the evaluator.

Violation = immediate cancellation. No refund. No reschedule.
For medical or official reasons, see our Cancellation and Refund Policy: ${CANCELLATION_POLICY_URL}

Your feedback report will be in your dashboard within 24 hours.

— Score Mirror team`;
}

function buildHtml(p: BookingConfirmationMailPayload): string {
    const whenHtml = escapeHtml(formatSessionWhen(p.scheduledAt));
    const meetBlock = p.meetLink?.trim()
        ? `<li><strong>Meeting link (Google Meet):</strong> <a href="${escapeHtml(p.meetLink.trim())}">${escapeHtml(p.meetLink.trim())}</a></li>`
        : "";

    return `<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
  <p>Dear ${escapeHtml(p.studentDisplayName)},</p>
  <p>Thank you for booking your evaluation.</p>
  <p><strong>Session details:</strong></p>
  <ul>
    <li><strong>Go to:</strong> <a href="${SITE_ORIGIN}">${SITE_ORIGIN}</a> &gt; login &gt; bookings — your booking is listed there.</li>
    <li><strong>Date &amp; time (Nepal time):</strong> ${whenHtml}</li>
  </ul>
  <p><strong>What happens next:</strong></p>
  <ul>
    <li>Join on time via Google Meet</li>
    ${meetBlock}
    <li>Speaking test: 11–14 minutes</li>
    <li>Premium: recording + report + verbal Q&amp;A</li>
  </ul>
  <p><strong>You must:</strong></p>
  <ul>
    <li>Be alone in a quiet room. Camera on. Microphone on.</li>
    <li>Use a laptop. Test your equipment before joining.</li>
    <li>Keep your passport/ID nearby.</li>
    <li>Sit upright, facing the camera.</li>
    <li>Turn off all other devices (ringers, vibrations).</li>
  </ul>
  <p><strong>You must not:</strong></p>
  <ul>
    <li>Take the test from bed, public space, or vehicle.</li>
    <li>Have another person in the room.</li>
    <li>Use notes, other screens, or devices.</li>
    <li>Eat, drink, or interrupt the evaluator.</li>
  </ul>
  <p><strong>Violation = immediate cancellation. No refund. No reschedule.</strong></p>
  <p>For medical or official reasons, see our <a href="${CANCELLATION_POLICY_URL}">Cancellation and Refund Policy</a>.</p>
  <p>Your feedback report will be in your dashboard within 24 hours.</p>
  <p>— Score Mirror team</p>
</body>
</html>`;
}

export async function sendBookingConfirmedEmail(
    payload: BookingConfirmationMailPayload,
): Promise<SendMailResult> {
    if (!isSmtpConfigured()) {
        return {
            ok: false,
            error:
                "SMTP is not configured. Set SMTP_HOST and MAIL_FROM (and usually SMTP_PORT, SMTP_USER, SMTP_PASSWORD).",
        };
    }
    try {
        const transport = getTransport();
        await transport.sendMail({
            from: process.env.MAIL_FROM!.trim(),
            to: payload.to,
            subject: BOOKING_CONFIRM_SUBJECT,
            text: buildPlainText(payload),
            html: buildHtml(payload),
        });
        return { ok: true };
    } catch (e) {
        const message = e instanceof Error ? e.message : "Unknown error";
        return { ok: false, error: message.slice(0, 500) };
    }
}

export function resolveBookingRecipientEmail(booking: {
    studentEmail: string | null;
    user: { email: string };
}): string | null {
    const fromBooking = booking.studentEmail?.trim();
    if (fromBooking) return fromBooking;
    const fromUser = booking.user.email?.trim();
    return fromUser || null;
}

export function displayNameFromParts(
    first: string,
    last: string,
    middle?: string | null,
): string {
    const m = middle?.trim();
    return [first.trim(), m, last.trim()].filter(Boolean).join(" ");
}

export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}
