import { describe, expect, it, vi } from "vitest";
import { assignWritingQuestion } from "@/lib/writing-question-assigner";

describe("assignWritingQuestion", () => {
    it("returns null when no active questions", async () => {
        const tx = {
            writingQuestion: {
                findMany: vi.fn().mockResolvedValue([]),
            },
            booking: { findMany: vi.fn() },
        };
        await expect(assignWritingQuestion("student-1", tx as never)).resolves.toBeNull();
        expect(tx.booking.findMany).not.toHaveBeenCalled();
    });

    it("returns an unseen question id when available", async () => {
        const tx = {
            writingQuestion: {
                findMany: vi
                    .fn()
                    .mockResolvedValue([{ id: "q1" }, { id: "q2" }]),
            },
            booking: {
                findMany: vi.fn().mockResolvedValue([
                    { writingQuestionId: "q1" },
                ]),
            },
        };
        vi.spyOn(Math, "random").mockReturnValue(0.99);
        await expect(assignWritingQuestion("student-1", tx as never)).resolves.toBe(
            "q2",
        );
        vi.restoreAllMocks();
    });

    it("falls back to least-used when all questions seen", async () => {
        const tx = {
            writingQuestion: {
                findMany: vi
                    .fn()
                    .mockResolvedValue([{ id: "q1" }, { id: "q2" }]),
            },
            booking: {
                findMany: vi.fn().mockResolvedValue([
                    { writingQuestionId: "q1" },
                    { writingQuestionId: "q2" },
                    { writingQuestionId: "q1" },
                ]),
            },
        };
        await expect(assignWritingQuestion("student-1", tx as never)).resolves.toBe(
            "q2",
        );
    });
});
