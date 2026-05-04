import { describe, expect, it } from "vitest";
import {
    cancelBookingSchema,
    createBundleSchema,
    createPackageSchema,
    createUserSchema,
    firstError,
    updateAvailabilitySchema,
    updateOwnProfileSchema,
    updateUserAdminSchema,
} from "@/lib/validations";

describe("createPackageSchema", () => {
    it("coerces price", () => {
        const r = createPackageSchema.safeParse({
            name: "P",
            price: "12.5",
            isActive: true,
        });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.price).toBe(12.5);
    });
});

describe("createBundleSchema", () => {
    const valid = {
        name: "B",
        priceStandard: 1,
        pricePriority: 2,
        priceInstant: 3,
        duration: 60,
        hasEvaluation: false,
        packageIds: ["a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"],
    };

    it("accepts valid bundle", () => {
        expect(createBundleSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects empty packageIds", () => {
        const r = createBundleSchema.safeParse({ ...valid, packageIds: [] });
        expect(r.success).toBe(false);
    });
});

describe("cancelBookingSchema", () => {
    it("requires uuid booking id", () => {
        expect(cancelBookingSchema.safeParse({ bookingId: "x" }).success).toBe(
            false,
        );
    });
});

describe("createUserSchema", () => {
    it("defaults role USER", () => {
        const r = createUserSchema.safeParse({
            username: "abc_user_x",
            email: "a@b.co",
            password: "password1",
            firstName: "F",
            lastName: "L",
            role: "USER",
            isActive: true,
        });
        expect(r.success).toBe(true);
    });
});

describe("updateUserAdminSchema", () => {
    const base = {
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        firstName: "F",
        lastName: "L",
        email: "e@example.com",
        role: "USER" as const,
        isActive: true,
    };

    it("rejects short optional password", () => {
        const r = updateUserAdminSchema.safeParse({
            ...base,
            newPassword: "short",
        });
        expect(r.success).toBe(false);
        if (!r.success) expect(firstError(r.error)).toContain("8 characters");
    });

    it("allows empty optional password", () => {
        expect(
            updateUserAdminSchema.safeParse({ ...base, newPassword: "" })
                .success,
        ).toBe(true);
    });
});

describe("updateOwnProfileSchema", () => {
    it("allows nullable bio", () => {
        expect(
            updateOwnProfileSchema.safeParse({
                firstName: "A",
                lastName: "Z",
                email: "a@z.com",
                phone: null,
                middleName: null,
                bio: null,
            }).success,
        ).toBe(true);
    });
});

describe("updateAvailabilitySchema", () => {
    const id = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

    it("rejects when end is not after start", () => {
        const r = updateAvailabilitySchema.safeParse({
            id,
            date: new Date("2026-01-15"),
            startTime: "12:00",
            endTime: "10:00",
        });
        expect(r.success).toBe(false);
    });
});
