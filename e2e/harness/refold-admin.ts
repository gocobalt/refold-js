import type { E2EConfig } from "./env";

/** The headers the public API expects (API-key auth + environment), as the automations suite stamps. */
function headers(cfg: E2EConfig): Record<string, string> {
    return {
        "content-type": "application/json",
        environment: cfg.environment,
        "x-api-key": cfg.apiKey,
        "cobalt-internal": "true",
    };
}

/**
 * Mints a session token for a linked account — the token the browser SDK runs on. Done server-side
 * with the org API key, exactly as a customer's backend would (POST /api/v2/public/session-token).
 */
export async function mintSessionToken(cfg: E2EConfig, linkedAccount = cfg.linkedAccount): Promise<string> {
    const res = await fetch(`${cfg.baseURL}/api/v2/public/session-token`, {
        method: "POST",
        headers: headers(cfg),
        body: JSON.stringify({ linked_account_id: linkedAccount }),
    });
    const data = (await res.json().catch(() => ({}))) as { token?: unknown };
    if (!res.ok || typeof data.token !== "string") {
        throw new Error(`session-token failed: ${res.status} ${JSON.stringify(data)}`);
    }
    return data.token;
}

/** The connections currently on a linked account. */
export async function listConnections(cfg: E2EConfig, linkedAccount = cfg.linkedAccount): Promise<Array<Record<string, unknown>>> {
    const res = await fetch(`${cfg.baseURL}/api/v2/public/linked-account/${encodeURIComponent(linkedAccount)}`, { headers: headers(cfg) });
    const data = (await res.json().catch(() => ({}))) as { integrations?: Array<Record<string, unknown>> };
    return data.integrations ?? [];
}

/** True when the linked account holds a connection for the given app slug. */
export async function isConnected(cfg: E2EConfig, slug: string, linkedAccount = cfg.linkedAccount): Promise<boolean> {
    const ints = await listConnections(cfg, linkedAccount);
    return ints.some((i) => [i.type, i.app_id, i.name, i.slug].some((v) => String(v ?? "").includes(slug)));
}

/** Remove a connection (teardown / clean slate). DELETE /api/v2/public/linked-account/integration/:slug. */
export async function disconnect(cfg: E2EConfig, slug: string, linkedAccount = cfg.linkedAccount): Promise<number> {
    const res = await fetch(`${cfg.baseURL}/api/v2/public/linked-account/integration/${encodeURIComponent(slug)}`, {
        method: "DELETE",
        headers: { ...headers(cfg), linked_account_id: linkedAccount },
    });
    return res.status;
}
