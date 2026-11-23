import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Loads e2e/.env into process.env — no dependency, matching the SDK's zero-dependency ethos. A value
 * already in the environment (e.g. a CI secret) is left untouched. Resolved from the working
 * directory (the repo root, where npm scripts and Playwright run).
 */
export function loadDotEnv(): void {
    let text: string;
    try {
        text = readFileSync(join(process.cwd(), "e2e", ".env"), "utf8");
    } catch {
        return; // no .env file — rely on the real environment
    }
    for (const line of text.split("\n")) {
        const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
        if (!m) continue;
        let value = m[2];
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (process.env[m[1]] === undefined) process.env[m[1]] = value;
    }
}

export interface E2EConfig {
    baseURL: string;
    environment: string;
    /** May be "" when e2e/.env is absent — connect specs skip on it; the harness smoke needs no creds. */
    apiKey: string;
    linkedAccount: string;
}

/**
 * Reads the e2e config (loading e2e/.env first). Does NOT throw when the API key is missing — that
 * would make every spec fail at import and `npm run test:e2e` run zero tests (harness smoke included).
 * Connect specs skip on an empty apiKey; the functions that use it (mintSessionToken) fail loudly.
 */
export function loadConfig(): E2EConfig {
    loadDotEnv();
    return {
        baseURL: process.env.REFOLD_BASE_URL || "https://uat.refold.ai",
        environment: process.env.REFOLD_ENVIRONMENT || "test",
        apiKey: process.env.REFOLD_API_KEY || "",
        linkedAccount: process.env.REFOLD_LINKED_ACCOUNT || "cobalt_test_user",
    };
}
