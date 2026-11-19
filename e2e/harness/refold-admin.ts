import type { E2EConfig } from "./env";

/**
 * Mints a session token for a linked account — the token the browser SDK runs on. Done server-side
 * with the org API key, exactly as a customer's backend would (POST /api/v2/public/session-token).
 */
export async function mintSessionToken(cfg: E2EConfig, linkedAccount = cfg.linkedAccount): Promise<string> {
    const res = await fetch(`${cfg.baseURL}/api/v2/public/session-token`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            environment: cfg.environment,
            "x-api-key": cfg.apiKey,
            "cobalt-internal": "true",
        },
        body: JSON.stringify({ linked_account_id: linkedAccount }),
    });
    const data = (await res.json().catch(() => ({}))) as { token?: unknown };
    if (!res.ok || typeof data.token !== "string") {
        throw new Error(`session-token failed: ${res.status} ${JSON.stringify(data)}`);
    }
    return data.token;
}
