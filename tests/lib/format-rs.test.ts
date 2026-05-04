import { describe, expect, it } from "vitest";
import { formatRs } from "@/lib/format-rs";

describe("formatRs", () => {
    it("formats with Rs. prefix and default fraction digits", () => {
        expect(formatRs(1234.5)).toMatch(/^Rs\. 1,234\.50$/);
    });

    it("respects digit options", () => {
        expect(formatRs(99, { minimumFractionDigits: 0, maximumFractionDigits: 0 })).toBe(
            "Rs. 99",
        );
    });
});
