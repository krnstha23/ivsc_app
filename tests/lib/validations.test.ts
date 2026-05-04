import { describe, expect, it } from "vitest";
import {
    createAvailabilitySchema,
    firstError,
    registerSchema,
    createStaticPageSchema,
} from "@/lib/validations";

describe("firstError", () => {
    it("returns first issue message", () => {
        const r = registerSchema.safeParse({
            username: "ab",
            firstName: "",
            middleName: null,
            lastName: "Doe",
            phone: null,
            email: "bad",
            userType: "student",
            password: "short",
        });
        expect(r.success).toBe(false);
        if (!r.success) {
            expect(firstError(r.error).length).toBeGreaterThan(0);
        }
    });
});

describe("registerSchema", () => {
    it("accepts valid payload", () => {
        const r = registerSchema.safeParse({
            username: "john_doe",
            firstName: "John",
            middleName: null,
            lastName: "Doe",
            phone: null,
            email: "john@example.com",
            userType: "student",
            password: "password123",
        });
        expect(r.success).toBe(true);
    });

    it("rejects invalid username chars", () => {
        const r = registerSchema.safeParse({
            username: "john-doe",
            firstName: "J",
            middleName: null,
            lastName: "D",
            phone: null,
            email: "a@b.co",
            userType: "student",
            password: "password123",
        });
        expect(r.success).toBe(false);
    });
});

describe("createAvailabilitySchema", () => {
    const base = {
        date: new Date("2026-06-01T12:00:00.000Z"),
        startTime: "09:00",
        endTime: "17:00",
    };

    it("accepts valid window", () => {
        expect(createAvailabilitySchema.safeParse(base).success).toBe(true);
    });

    it("rejects end before start", () => {
        const r = createAvailabilitySchema.safeParse({
            ...base,
            startTime: "18:00",
            endTime: "09:00",
        });
        expect(r.success).toBe(false);
        if (!r.success) {
            expect(firstError(r.error)).toContain("End time must be after");
        }
    });
});

describe("createStaticPageSchema", () => {
    it("requires title and content", () => {
        expect(
            createStaticPageSchema.safeParse({
                title: "",
                content: "x",
                isActive: true,
            }).success,
        ).toBe(false);
    });
});
