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
    apiKey: string;
    linkedAccount: string;
    connectSlug?: string;
}

/** Reads the e2e config (loading e2e/.env first). Throws clearly if the API key is missing. */
export function loadConfig(): E2EConfig {
    loadDotEnv();
    const apiKey = process.env.REFOLD_API_KEY;
    if (!apiKey) throw new Error("REFOLD_API_KEY is not set — add it to e2e/.env (see e2e/.env.example).");
    return {
        baseURL: process.env.REFOLD_BASE_URL || "https://uat.refold.ai",
        environment: process.env.REFOLD_ENVIRONMENT || "test",
        apiKey,
        linkedAccount: process.env.REFOLD_LINKED_ACCOUNT || "cobalt_test_user",
        connectSlug: process.env.REFOLD_CONNECT_SLUG || undefined,
    };
}
