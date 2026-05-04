import { describe, expect, it } from "vitest";
import {
    canAccess,
    filterByRole,
    ROLES,
    type Role,
} from "@/lib/permissions";

describe("canAccess", () => {
    it("returns false when role is undefined", () => {
        expect(canAccess(undefined, ["ADMIN"])).toBe(false);
    });

    it("returns true when role is in allowedRoles", () => {
        expect(canAccess("ADMIN", ["ADMIN", "TEACHER"])).toBe(true);
    });

    it("returns false when role is not in allowedRoles", () => {
        expect(canAccess("USER", ["ADMIN"])).toBe(false);
    });
});

describe("filterByRole", () => {
    const items: { title: string; url: string; allowedRoles: Role[] }[] = [
        { title: "A", url: "/a", allowedRoles: [...ROLES] },
        { title: "AdminOnly", url: "/x", allowedRoles: ["ADMIN"] },
    ];

    it("returns empty array when role is undefined", () => {
        expect(filterByRole(items, undefined)).toEqual([]);
    });

    it("filters nav items and strips allowedRoles", () => {
        const u = filterByRole(items, "USER");
        expect(u).toHaveLength(1);
        expect(u[0]).toEqual({ title: "A", url: "/a" });
        expect("allowedRoles" in u[0]).toBe(false);
    });

    it("returns admin-only item for ADMIN", () => {
        const a = filterByRole(items, "ADMIN");
        expect(a.map((i) => i.title)).toContain("AdminOnly");
    });
});
