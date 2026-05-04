import { describe, expect, it, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
const mockTeacherFind = vi.fn();
const mockBookingFind = vi.fn();
const mockBookingUpdate = vi.fn();
const mockWritingCreate = vi.fn();
const mockWritingDelete = vi.fn();
const mockEvalCreate = vi.fn();

vi.mock("@/lib/auth", () => ({
    auth: () => mockAuth(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        teacherProfile: {
            findUnique: (...a: unknown[]) => mockTeacherFind(...a),
        },
        booking: {
            findUnique: (...a: unknown[]) => mockBookingFind(...a),
            update: (...a: unknown[]) => mockBookingUpdate(...a),
        },
        writingSubmission: {
            create: (...a: unknown[]) => mockWritingCreate(...a),
            delete: (...a: unknown[]) => mockWritingDelete(...a),
        },
        evaluation: {
            create: (...a: unknown[]) => mockEvalCreate(...a),
        },
    },
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("fs/promises", () => ({
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
}));

import {
    setMeetLink,
    uploadWriting,
    deleteWriting,
    submitEvaluation,
} from "@/app/(app)/sessions/actions";

const bid = "a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const meetUrl = "https://meet.google.com/abc-defg-hij";

describe("setMeetLink", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects bad url", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
        const r = await setMeetLink(bid, "not-a-url");
        expect(r.success).toBe(false);
    });

    it("allows admin to set link", async () => {
        mockAuth.mockResolvedValue({ user: { id: "adm", role: "ADMIN" } });
        mockBookingFind.mockResolvedValue({
            id: bid,
            teacherId: "t1",
        });
        mockBookingUpdate.mockResolvedValue({});

        const r = await setMeetLink(bid, meetUrl);
        expect(r).toEqual({ success: true });
    });

    it("rejects teacher for other teacher booking", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
        mockTeacherFind.mockResolvedValue({ id: "my-tp" });
        mockBookingFind.mockResolvedValue({
            id: bid,
            teacherId: "other-tp",
        });

        const r = await setMeetLink(bid, meetUrl);
        expect(r.success).toBe(false);
    });
});

describe("uploadWriting", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects non-student", async () => {
        mockAuth.mockResolvedValue({ user: { id: "u1", role: "TEACHER" } });
        const fd = new FormData();
        const r = await uploadWriting(fd);
        expect(r.success).toBe(false);
    });

    it("rejects non-pdf", async () => {
        mockAuth.mockResolvedValue({ user: { id: "stu", role: "USER" } });
        const fd = new FormData();
        fd.set("bookingId", bid);
        const file = new File([new Uint8Array([1])], "x.txt", {
            type: "text/plain",
        });
        fd.set("file", file);
        const r = await uploadWriting(fd);
        expect(r.success).toBe(false);
    });

    it("uploads pdf for own booking", async () => {
        mockAuth.mockResolvedValue({ user: { id: "stu", role: "USER" } });
        mockBookingFind.mockResolvedValue({
            id: bid,
            userId: "stu",
            writingSubmission: null,
        });
        mockWritingCreate.mockResolvedValue({});

        const fd = new FormData();
        fd.set("bookingId", bid);
        const pdf = new File([new Uint8Array([37, 80, 68, 70])], "w.pdf", {
            type: "application/pdf",
        });
        fd.set("file", pdf);

        const r = await uploadWriting(fd);
        expect(r).toEqual({ success: true });
        expect(mockWritingCreate).toHaveBeenCalled();
    });
});

describe("deleteWriting", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects when evaluation exists", async () => {
        mockAuth.mockResolvedValue({ user: { id: "stu", role: "USER" } });
        mockBookingFind.mockResolvedValue({
            userId: "stu",
            writingSubmission: { id: "ws", filePath: "uploads/writings/x.pdf" },
            evaluation: { id: "ev" },
        });

        const r = await deleteWriting(bid);
        expect(r.success).toBe(false);
        expect(mockWritingDelete).not.toHaveBeenCalled();
    });

    it("deletes submission when allowed", async () => {
        mockAuth.mockResolvedValue({ user: { id: "stu", role: "USER" } });
        mockBookingFind.mockResolvedValue({
            userId: "stu",
            writingSubmission: { id: "ws", filePath: "uploads/writings/x.pdf" },
            evaluation: null,
        });
        mockWritingDelete.mockResolvedValue({});

        const r = await deleteWriting(bid);
        expect(r).toEqual({ success: true });
    });
});

describe("submitEvaluation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects invalid score", async () => {
        mockAuth.mockResolvedValue({ user: { id: "t1", role: "TEACHER" } });
        const r = await submitEvaluation(bid, 101, "ok");
        expect(r.success).toBe(false);
    });

    it("creates evaluation for assigned teacher", async () => {
        mockAuth.mockResolvedValue({ user: { id: "tuser", role: "TEACHER" } });
        mockTeacherFind.mockResolvedValue({ id: "tp1" });
        mockBookingFind.mockResolvedValue({
            id: bid,
            teacherId: "tp1",
            evaluation: null,
        });
        mockEvalCreate.mockResolvedValue({});

        const r = await submitEvaluation(bid, 85, "Good work.");
        expect(r).toEqual({ success: true });
        expect(mockEvalCreate).toHaveBeenCalled();
    });

    it("allows admin without teacher profile match", async () => {
        mockAuth.mockResolvedValue({ user: { id: "adm", role: "ADMIN" } });
        mockBookingFind.mockResolvedValue({
            id: bid,
            teacherId: "tp9",
            evaluation: null,
        });
        mockEvalCreate.mockResolvedValue({});

        const r = await submitEvaluation(bid, 10, "Admin override.");
        expect(r).toEqual({ success: true });
        expect(mockTeacherFind).not.toHaveBeenCalled();
    });
});
