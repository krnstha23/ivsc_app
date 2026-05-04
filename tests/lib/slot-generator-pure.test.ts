import { describe, expect, it } from "vitest";
import {
    computeLeadTimeCategory,
    minutesToTime,
    timeToMinutes,
} from "@/lib/slot-generator";

describe("timeToMinutes / minutesToTime", () => {
    it("round-trips common values", () => {
        expect(timeToMinutes("09:30")).toBe(570);
        expect(minutesToTime(570)).toBe("09:30");
    });

    it("pads minutes", () => {
        expect(minutesToTime(65)).toBe("01:05");
    });
});

describe("computeLeadTimeCategory", () => {
    it("returns INSTANT when confirmation and session share NPT calendar day", () => {
        const confirm = new Date("2026-05-10T02:00:00.000Z");
        const session = new Date("2026-05-10T10:00:00.000Z");
        expect(computeLeadTimeCategory(confirm, session)).toBe("INSTANT");
    });

    it("returns STANDARD when >= 48h apart (different days)", () => {
        const confirm = new Date("2026-05-01T12:00:00.000Z");
        const session = new Date("2026-05-05T12:00:00.000Z");
        expect(computeLeadTimeCategory(confirm, session)).toBe("STANDARD");
    });

    it("returns PRIORITY between 24h and 48h", () => {
        const confirm = new Date("2026-05-01T12:00:00.000Z");
        const session = new Date("2026-05-02T18:00:00.000Z"); // 30h later
        expect(computeLeadTimeCategory(confirm, session)).toBe("PRIORITY");
    });

    it("returns INSTANT when under 24h and different NPT days", () => {
        const confirm = new Date("2026-05-01T22:00:00.000Z");
        const session = new Date("2026-05-02T08:00:00.000Z"); // 10h
        expect(computeLeadTimeCategory(confirm, session)).toBe("INSTANT");
    });
});
