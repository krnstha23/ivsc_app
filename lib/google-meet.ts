/**
 * Google Meet REST API utility.
 *
 * Uses a Google Workspace service account with domain-wide delegation to create
 * Meet spaces on behalf of the configured host user. Recording is controlled
 * by the `recordingEnabled` parameter.
 *
 * Required env vars:
 *   GOOGLE_SERVICE_ACCOUNT_KEY  — full service-account JSON as a single-line string
 *   GOOGLE_MEET_HOST_EMAIL      — Workspace user the service account impersonates
 */

import { google } from "googleapis";

const SCOPES = [
    "https://www.googleapis.com/auth/meetings.space.created",
    "https://www.googleapis.com/auth/meetings.space.readonly",
];

function buildAuth() {
    const hostEmail = process.env.GOOGLE_MEET_HOST_EMAIL;
    if (!hostEmail) {
        throw new Error(
            "Google Meet is not configured. Set GOOGLE_MEET_HOST_EMAIL.",
        );
    }

    // Supports two env-var patterns:
    //   GOOGLE_SERVICE_ACCOUNT_KEY_PATH — path to the downloaded JSON file (recommended)
    //   GOOGLE_SERVICE_ACCOUNT_KEY      — full JSON as a single-line string (fallback)
    let raw: string | undefined;
    const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
    if (keyPath) {
        const { readFileSync } = require("fs") as typeof import("fs");
        const { resolve } = require("path") as typeof import("path");
        raw = readFileSync(resolve(process.cwd(), keyPath), "utf-8");
    } else {
        raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    }

    if (!raw) {
        throw new Error(
            "Google Meet is not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY_PATH (path to JSON file) or GOOGLE_SERVICE_ACCOUNT_KEY (single-line JSON string).",
        );
    }

    const key = JSON.parse(raw) as {
        client_email: string;
        private_key: string;
    };

    return new google.auth.JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: SCOPES,
        subject: hostEmail,
    });
}

export type MeetSpace = {
    meetingUri: string;
    spaceName: string;
};

/**
 * Creates a new Google Meet space.
 *
 * Recording is governed by Google Workspace Admin policy (Admin Console →
 * Apps → Google Meet → Recording), not by this API call.
 * Requires Workspace Business Standard or higher on the host account.
 */
export async function createMeetSpace(): Promise<MeetSpace> {
    const auth = buildAuth();
    const meet = google.meet({ version: "v2", auth });

    const response = await meet.spaces.create({
        requestBody: {
            config: {
                accessType: "OPEN",
            },
        },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (response as any).data as { meetingUri?: string; name?: string };
    const meetingUri = data.meetingUri;
    const spaceName = data.name;

    if (!meetingUri || !spaceName) {
        throw new Error("Google Meet API returned an incomplete space object.");
    }

    return { meetingUri, spaceName };
}
