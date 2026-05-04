import { describe, expect, it } from "vitest";
import {
    sanitizeCssColor,
    sanitizeCssTokenName,
    serializeJsonForHtmlScript,
} from "@/lib/security";

describe("serializeJsonForHtmlScript", () => {
    it("escapes angle brackets in JSON string", () => {
        const s = serializeJsonForHtmlScript({ x: "</script><script>evil()" });
        expect(s).not.toContain("</script>");
        expect(s).toContain("\\u003c");
    });
});

describe("sanitizeCssTokenName", () => {
    it("allows safe tokens", () => {
        expect(sanitizeCssTokenName("chart-bar-1")).toBe("chart-bar-1");
    });

    it("rejects injection attempts", () => {
        expect(sanitizeCssTokenName("foo);{")).toBeNull();
    });
});

describe("sanitizeCssColor", () => {
    it("allows hex colors", () => {
        expect(sanitizeCssColor("#7C5CFF")).toBe("#7C5CFF");
    });

    it("rejects arbitrary strings", () => {
        expect(sanitizeCssColor("expression(url evil)")).toBeNull();
    });
});
