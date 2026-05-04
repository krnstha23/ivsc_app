import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/passwords";

describe("passwords", () => {
    it("verifyPassword succeeds after hashPassword", async () => {
        const hash = await hashPassword("correct horse battery staple");
        expect(await verifyPassword("correct horse battery staple", hash)).toBe(
            true,
        );
        expect(await verifyPassword("wrong", hash)).toBe(false);
    });
});
