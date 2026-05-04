import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockFindUnique = vi.fn();
const mockFindFirst = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/auth", () => ({
    auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        staticPage: {
            findUnique: (...a: unknown[]) => mockFindUnique(...a),
            findFirst: (...a: unknown[]) => mockFindFirst(...a),
            create: (...a: unknown[]) => mockCreate(...a),
            update: (...a: unknown[]) => mockUpdate(...a),
            delete: (...a: unknown[]) => mockDelete(...a),
        },
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

import {
    createStaticPage,
    updateStaticPage,
    deleteStaticPage,
    toggleStaticPageActive,
} from "@/app/(app)/pages/actions";

function form(
    data: Record<string, string | undefined>,
): FormData {
    const fd = new FormData();
    for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) fd.set(k, v);
    }
    return fd;
}

describe("static page actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createStaticPage", () => {
        it("forbids non-admin", async () => {
            mockAuth.mockResolvedValue({ user: { role: "USER" } });
            const r = await createStaticPage(form({ title: "T", content: "<p>x</p>" }));
            expect(r).toEqual({ success: false, error: "Forbidden." });
        });

        it("rejects empty content after sanitize", async () => {
            mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
            const r = await createStaticPage(
                form({ title: "T", content: "   <script></script>   " }),
            );
            expect(r.success).toBe(false);
        });

        it("rejects duplicate slug", async () => {
            mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
            mockFindUnique.mockResolvedValue({ id: "existing" });
            const r = await createStaticPage(
                form({ title: "About Us", content: "<p>body</p>", isActive: "on" }),
            );
            expect(r).toEqual({
                success: false,
                error: "A page with this title already exists.",
            });
        });

        it("creates page", async () => {
            mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
            mockFindUnique.mockResolvedValue(null);
            mockCreate.mockResolvedValue({});
            const r = await createStaticPage(
                form({ title: "New Page", content: "<p>ok</p>", isActive: "on" }),
            );
            expect(r).toEqual({ success: true });
            expect(mockCreate).toHaveBeenCalled();
        });
    });

    describe("updateStaticPage", () => {
        const id = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

        it("updates when slug free and page exists", async () => {
            mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
            mockFindFirst.mockResolvedValue(null);
            mockFindUnique.mockResolvedValue({ id: true });
            mockUpdate.mockResolvedValue({});

            const fd = form({
                id,
                title: "Updated",
                content: "<p>text</p>",
                isActive: "on",
            });
            const r = await updateStaticPage(fd);
            expect(r).toEqual({ success: true });
        });

        it("returns not found", async () => {
            mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
            mockFindFirst.mockResolvedValue(null);
            mockFindUnique.mockResolvedValue(null);

            const r = await updateStaticPage(
                form({ id, title: "X", content: "<p>y</p>" }),
            );
            expect(r).toEqual({ success: false, error: "Page not found." });
        });
    });

    describe("deleteStaticPage", () => {
        it("forbids non-admin", async () => {
            mockAuth.mockResolvedValue({ user: { role: "TEACHER" } });
            const r = await deleteStaticPage("id");
            expect(r.success).toBe(false);
            expect(mockDelete).not.toHaveBeenCalled();
        });

        it("deletes for admin", async () => {
            mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
            mockDelete.mockResolvedValue({});
            const r = await deleteStaticPage("page-id");
            expect(r).toEqual({ success: true });
        });
    });

    describe("toggleStaticPageActive", () => {
        it("toggles when page exists", async () => {
            mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
            mockFindUnique.mockResolvedValue({ isActive: true });
            mockUpdate.mockResolvedValue({});

            const r = await toggleStaticPageActive("pid");
            expect(r).toEqual({ success: true });
            expect(mockUpdate).toHaveBeenCalledWith({
                where: { id: "pid" },
                data: { isActive: false },
            });
        });

        it("returns not found", async () => {
            mockAuth.mockResolvedValue({ user: { role: "ADMIN" } });
            mockFindUnique.mockResolvedValue(null);
            const r = await toggleStaticPageActive("missing");
            expect(r).toEqual({ success: false, error: "Not found" });
        });
    });
});
