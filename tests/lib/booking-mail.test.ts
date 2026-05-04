import { describe, expect, it } from "vitest";
import {
    displayNameFromParts,
    normalizeEmail,
    resolveBookingRecipientEmail,
} from "@/lib/booking-mail";

describe("resolveBookingRecipientEmail", () => {
    it("prefers studentEmail when set", () => {
        expect(
            resolveBookingRecipientEmail({
                studentEmail: "  stu@school.test  ",
                user: { email: "user@example.com" },
            }),
        ).toBe("stu@school.test");
    });

    it("falls back to user.email", () => {
        expect(
            resolveBookingRecipientEmail({
                studentEmail: null,
                user: { email: "only@example.com" },
            }),
        ).toBe("only@example.com");
    });

    it("returns null when both missing", () => {
        expect(
            resolveBookingRecipientEmail({
                studentEmail: null,
                user: { email: "" },
            }),
        ).toBeNull();
    });
});

describe("normalizeEmail", () => {
    it("trims and lowercases", () => {
        expect(normalizeEmail("  User@HOST.COM ")).toBe("user@host.com");
    });
});

describe("displayNameFromParts", () => {
    it("joins with middle name when present", () => {
        expect(displayNameFromParts("A", "Z", "M")).toBe("A M Z");
    });

    it("omits empty middle", () => {
        expect(displayNameFromParts("A", "Z", null)).toBe("A Z");
    });
});
