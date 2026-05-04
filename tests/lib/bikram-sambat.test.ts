import { describe, expect, it } from "vitest";
import { getBsWeekBounds } from "@/lib/bikram-sambat";

describe("getBsWeekBounds", () => {
    it("returns start before end", () => {
        const d = new Date("2026-05-06T12:00:00.000Z");
        const { start, end } = getBsWeekBounds(d);
        expect(start.getTime()).toBeLessThan(end.getTime());
    });

    it("returns week window seven days apart in UTC representation", () => {
        const d = new Date("2026-01-15T08:00:00.000Z");
        const { start, end } = getBsWeekBounds(d);
        const diffDays = (end.getTime() - start.getTime()) / (24 * 3600 * 1000);
        expect(diffDays).toBeCloseTo(7, 5);
    });
});
