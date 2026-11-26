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

interface Integration { type?: string; connection_id?: string; status?: string; reauth_required?: boolean }

/** The connections currently on a linked account. Throws on a failed response so a 401/5xx isn't read as "no connections". */
export async function listConnections(cfg: E2EConfig, linkedAccount = cfg.linkedAccount): Promise<Integration[]> {
    const res = await fetch(`${cfg.baseURL}/api/v2/public/linked-account/${encodeURIComponent(linkedAccount)}`, { headers: headers(cfg) });
    const data = (await res.json().catch(() => ({}))) as { integrations?: Integration[] };
    if (!res.ok) throw new Error(`list connections failed: ${res.status} ${JSON.stringify(data)}`);
    return data.integrations ?? [];
}

/** The app's connected accounts (connection_id / status / connectedAt) from getApp — case 17 reads connectedAt. */
export async function connectionsOf(
    cfg: E2EConfig,
    slug: string,
    linkedAccount = cfg.linkedAccount,
): Promise<Array<{ connection_id?: string; status?: string; connectedAt?: unknown }>> {
    const token = await mintSessionToken(cfg, linkedAccount);
    const res = await fetch(`${cfg.baseURL}/api/v2/f-sdk/application/${encodeURIComponent(slug)}`, {
        headers: { ...headers(cfg), authorization: `Bearer ${token}` },
    });
    const app = (await res.json().catch(() => ({}))) as { connected_accounts?: Array<{ connection_id?: string; status?: string; connectedAt?: unknown }> };
    if (!res.ok) throw new Error(`getApp ${slug} failed: ${res.status}`);
    return app.connected_accounts ?? [];
}

/** True when the linked account holds an ACTIVE connection for exactly this app slug. */
export async function isConnected(cfg: E2EConfig, slug: string, linkedAccount = cfg.linkedAccount): Promise<boolean> {
    return (await listConnections(cfg, linkedAccount)).some((i) => i.type === slug && !i.reauth_required);
}

function assertDeleted(res: Response, what: string): void {
    // 404 is fine for a clean-slate teardown (nothing to remove); anything else non-2xx is a real failure.
    if (res.status !== 404 && (res.status < 200 || res.status >= 300)) {
        throw new Error(`disconnect ${what} failed: ${res.status}`);
    }
}

/** Remove a single-auth app's connection (teardown / clean slate). Throws on a non-2xx/404 response. */
export async function disconnect(cfg: E2EConfig, slug: string, linkedAccount = cfg.linkedAccount): Promise<void> {
    const res = await fetch(`${cfg.baseURL}/api/v2/public/linked-account/integration/${encodeURIComponent(slug)}`, {
        method: "DELETE",
        headers: { ...headers(cfg), linked_account_id: linkedAccount },
    });
    assertDeleted(res, slug);
}

/**
 * Remove EVERY connection for a slug, one by one by connection_id — needed for a multi-auth app
 * (e.g. jira), where disconnecting without a connection_id is refused (400) and connections pile up.
 * Matches the slug exactly and checks each DELETE, so a failed cleanup surfaces instead of leaving a
 * stale connection that later satisfies an isConnected poll. Uses the SDK's route:
 * DELETE /api/v1/linked-acc/integration/:slug?connection_id=.
 */
export async function disconnectAll(cfg: E2EConfig, slug: string, linkedAccount = cfg.linkedAccount): Promise<void> {
    const token = await mintSessionToken(cfg, linkedAccount);
    const mine = (await listConnections(cfg, linkedAccount)).filter((i) => i.type === slug);
    for (const i of mine) {
        const q = i.connection_id ? `?connection_id=${encodeURIComponent(i.connection_id)}` : "";
        const res = await fetch(`${cfg.baseURL}/api/v1/linked-acc/integration/${encodeURIComponent(slug)}${q}`, {
            method: "DELETE",
            headers: { ...headers(cfg), authorization: `Bearer ${token}` },
        });
        assertDeleted(res, `${slug} (${i.connection_id})`);
    }
}
