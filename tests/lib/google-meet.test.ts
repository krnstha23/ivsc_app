import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const spacesCreate = vi.fn().mockResolvedValue({
    data: {
        meetingUri: "https://meet.google.com/xxx-yyyy-zzz",
        name: "spaces/abc",
    },
});

class MockJWT {
    constructor(..._args: unknown[]) {}
}

vi.mock("googleapis", () => ({
    google: {
        auth: {
            JWT: MockJWT,
        },
        meet: vi.fn(() => ({
            spaces: {
                create: (...args: unknown[]) => spacesCreate(...args),
            },
        })),
    },
}));

describe("createMeetSpace", () => {
    const prevHost = process.env.GOOGLE_MEET_HOST_EMAIL;
    const prevKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.GOOGLE_MEET_HOST_EMAIL = "host@workspace.test";
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
            client_email: "sa@test.iam.gserviceaccount.com",
            private_key:
                "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC\n-----END PRIVATE KEY-----\n",
        });
    });

    afterEach(() => {
        process.env.GOOGLE_MEET_HOST_EMAIL = prevHost;
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY = prevKey;
    });

    it("returns meetingUri and spaceName from API", async () => {
        const { createMeetSpace } = await import("@/lib/google-meet");
        const r = await createMeetSpace();
        expect(r.meetingUri).toContain("meet.google.com");
        expect(r.spaceName).toBe("spaces/abc");
        expect(spacesCreate).toHaveBeenCalled();
    });

    it("throws when host email is not configured", async () => {
        process.env.GOOGLE_MEET_HOST_EMAIL = "";
        const { createMeetSpace } = await import("@/lib/google-meet");
        await expect(createMeetSpace()).rejects.toThrow("GOOGLE_MEET_HOST_EMAIL");
    });

    it("throws when API omits meeting URI", async () => {
        spacesCreate.mockResolvedValueOnce({ data: {} });
        const { createMeetSpace } = await import("@/lib/google-meet");
        await expect(createMeetSpace()).rejects.toThrow("incomplete");
    });

    it("throws when service account key is not configured", async () => {
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY = "";
        delete (process.env as { GOOGLE_SERVICE_ACCOUNT_KEY_PATH?: string })
            .GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
        const { createMeetSpace } = await import("@/lib/google-meet");
        await expect(createMeetSpace()).rejects.toThrow(
            "GOOGLE_SERVICE_ACCOUNT_KEY",
        );
    });
});
