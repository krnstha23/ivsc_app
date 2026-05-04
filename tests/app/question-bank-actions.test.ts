import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockCreate = vi.fn();

vi.mock("@/lib/auth", () => ({
    auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        writingQuestion: {
            findUnique: (...a: unknown[]) => mockFindUnique(...a),
            update: (...a: unknown[]) => mockUpdate(...a),
            delete: (...a: unknown[]) => mockDelete(...a),
            create: (...a: unknown[]) => mockCreate(...a),
        },
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("fs/promises", () => ({
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
}));

import {
    uploadQuestion,
    toggleQuestionActive,
    deleteQuestion,
} from "@/app/(app)/question-bank/actions";

describe("question-bank actions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("uploadQuestion", () => {
        function pdfForm(title: string, bytes = new Uint8Array([37, 80, 68, 70])) {
            const fd = new FormData();
            fd.set("title", title);
            fd.set(
                "file",
                new File([bytes], "q.pdf", { type: "application/pdf" }),
            );
            return fd;
        }

        it("rejects when not signed in", async () => {
            mockAuth.mockResolvedValue(null);
            const r = await uploadQuestion(pdfForm("T"));
            expect(r).toEqual({ success: false, error: "You must be signed in." });
        });

        it("rejects when not admin or teacher", async () => {
            mockAuth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
            const r = await uploadQuestion(pdfForm("T"));
            expect(r).toEqual({ success: false, error: "Not authorized." });
        });

        it("rejects empty title", async () => {
            mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
            const r = await uploadQuestion(pdfForm(""));
            expect(r.success).toBe(false);
        });

        it("rejects missing file", async () => {
            mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
            const fd = new FormData();
            fd.set("title", "Title");
            const r = await uploadQuestion(fd);
            expect(r).toEqual({ success: false, error: "No file provided." });
        });

        it("rejects non-pdf", async () => {
            mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
            const fd = new FormData();
            fd.set("title", "Valid title");
            fd.set(
                "file",
                new File([new Uint8Array([1, 2])], "x.txt", {
                    type: "text/plain",
                }),
            );
            const r = await uploadQuestion(fd);
            expect(r).toEqual({
                success: false,
                error: "Only PDF files are allowed.",
            });
        });

        it("rejects oversize file", async () => {
            mockAuth.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
            const big = new Uint8Array(21 * 1024 * 1024);
            big[0] = 37;
            big[1] = 80;
            big[2] = 68;
            big[3] = 70;
            const fd = new FormData();
            fd.set("title", "Big");
            fd.set(
                "file",
                new File([big], "big.pdf", { type: "application/pdf" }),
            );
            const r = await uploadQuestion(fd);
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.error).toContain("20 MB");
            }
        });

        it("creates question record", async () => {
            mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
            mockCreate.mockResolvedValue({});

            const r = await uploadQuestion(pdfForm("Exam prompt"));
            expect(r).toEqual({ success: true });
            expect(mockCreate).toHaveBeenCalled();
        });
    });

    describe("toggleQuestionActive", () => {
        it("requires sign-in", async () => {
            mockAuth.mockResolvedValue(null);
            const r = await toggleQuestionActive("q1");
            expect(r).toEqual({ success: false, error: "You must be signed in." });
        });

        it("toggles active flag", async () => {
            mockAuth.mockResolvedValue({
                user: { id: "u1", role: "TEACHER" },
            });
            mockFindUnique.mockResolvedValue({ id: "q1", isActive: false });
            mockUpdate.mockResolvedValue({});

            const r = await toggleQuestionActive("q1");
            expect(r).toEqual({ success: true });
            expect(mockUpdate).toHaveBeenCalledWith({
                where: { id: "q1" },
                data: { isActive: true },
            });
        });

        it("returns not found", async () => {
            mockAuth.mockResolvedValue({
                user: { id: "u1", role: "ADMIN" },
            });
            mockFindUnique.mockResolvedValue(null);

            const r = await toggleQuestionActive("missing");
            expect(r).toEqual({ success: false, error: "Question not found." });
        });

        it("rejects student role", async () => {
            mockAuth.mockResolvedValue({
                user: { id: "u1", role: "USER" },
            });
            const r = await toggleQuestionActive("q1");
            expect(r).toEqual({ success: false, error: "Not authorized." });
        });
    });

    describe("deleteQuestion", () => {
        it("blocks delete when bookings reference question", async () => {
            mockAuth.mockResolvedValue({
                user: { id: "u1", role: "ADMIN" },
            });
            mockFindUnique.mockResolvedValue({
                id: "q1",
                filePath: "uploads/questions/x.pdf",
                _count: { bookings: 2 },
            });

            const r = await deleteQuestion("q1");
            expect(r.success).toBe(false);
            if (!r.success) {
                expect(r.error).toContain("Cannot delete");
            }
            expect(mockDelete).not.toHaveBeenCalled();
        });

        it("deletes when unused", async () => {
            mockAuth.mockResolvedValue({
                user: { id: "u1", role: "ADMIN" },
            });
            mockFindUnique.mockResolvedValue({
                id: "q1",
                filePath: "uploads/questions/x.pdf",
                _count: { bookings: 0 },
            });
            mockDelete.mockResolvedValue({});

            const r = await deleteQuestion("q1");
            expect(r).toEqual({ success: true });
            expect(mockDelete).toHaveBeenCalledWith({ where: { id: "q1" } });
        });

        it("returns not found", async () => {
            mockAuth.mockResolvedValue({
                user: { id: "u1", role: "TEACHER" },
            });
            mockFindUnique.mockResolvedValue(null);

            const r = await deleteQuestion("no-such");
            expect(r).toEqual({ success: false, error: "Question not found." });
        });

        it("rejects student role", async () => {
            mockAuth.mockResolvedValue({
                user: { id: "u1", role: "USER" },
            });
            const r = await deleteQuestion("q1");
            expect(r).toEqual({ success: false, error: "Not authorized." });
        });
    });
});
