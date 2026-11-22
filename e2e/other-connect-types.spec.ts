import { test, expect, type Page } from "@playwright/test";
import { loadConfig } from "./harness/env";
import { mintSessionToken, isConnected, disconnect } from "./harness/refold-admin";

/**
 * DEV-7914 — Other connect types (cases 13–15), against QA-controlled credentials, so no interactive
 * consent/OTP:
 *   13 — Auth0, a client-credentials (M2M) connector (exposed to the SDK as keybased; the
 *        client_credentials grant runs server-side) → connects with no popup.
 *   14 — Monday, a key-based connector (field api_token).
 *   15 — depends on the DEV-7912 SDK fix.
 */
const cfg = loadConfig();
const MONDAY_API_KEY = process.env.MONDAY_API_KEY;

/** Auth0 M2M credentials from e2e/.env, normalised (scheme added, trailing slash trimmed). */
function auth0Payload(): Record<string, string> | undefined {
    const client_id = process.env.AUTH0_CLIENT_ID;
    const client_secret = process.env.AUTH0_CLIENT_SECRET;
    let base_url = process.env.AUTH0_BASE_URL || "";
    if (base_url && !/^https?:\/\//i.test(base_url)) base_url = "https://" + base_url;
    base_url = base_url.replace(/\/+$/, "");
    if (!client_id || !client_secret || !base_url) return undefined;
    return { client_id, client_secret, base_url };
}

type Outcome = { ok: true; value: boolean } | { ok: false; error: string };

async function connectKeybased(page: Page, token: string, slug: string, payload: Record<string, string>): Promise<Outcome> {
    await page.goto(`/?baseUrl=${encodeURIComponent(cfg.baseURL)}&token=${encodeURIComponent(token)}`);
    return page.evaluate(async ({ slug, payload }) => {
        const refold = (window as unknown as { __refold: { connect: (p: unknown) => Promise<boolean> } }).__refold;
        try { return { ok: true as const, value: await refold.connect({ slug, type: "keybased", payload }) }; }
        catch (e) {
            const err = e as { message?: string; error?: string };
            return { ok: false as const, error: err?.message ?? err?.error ?? JSON.stringify(e) };
        }
    }, { slug, payload });
}

test.describe("other connect types", () => {
    const AUTH0 = auth0Payload();

    test("13. client-credentials connector (Auth0) → no popup, result true, account active", async ({ page }) => {
        test.skip(!AUTH0, "set AUTH0_CLIENT_ID / AUTH0_CLIENT_SECRET / AUTH0_BASE_URL in e2e/.env");
        await disconnect(cfg, "auth0"); // clean slate
        let popupOpened = false;
        page.on("popup", () => { popupOpened = true; });
        const token = await mintSessionToken(cfg);
        const result = await connectKeybased(page, token, "auth0", AUTH0!);
        // Auth0 runs the client_credentials grant server-side: no browser popup, connects straight away.
        expect(result).toEqual({ ok: true, value: true });
        expect(popupOpened, "a popup opened for a client-credentials connect").toBe(false);
        await expect.poll(() => isConnected(cfg, "auth0"), { timeout: 15_000, intervals: [1000, 2000] }).toBe(true);
    });

    test("14a. key-based with bad credentials → the server's error reaches the page", async ({ page }) => {
        const token = await mintSessionToken(cfg);
        const result = await connectKeybased(page, token, "monday", { api_token: "invalid-token-xxxxxxxx" });
        // The SDK throws the server's parsed error; connect() must not report success.
        expect(result.ok, `expected an error to reach the page, got ${JSON.stringify(result)}`).toBe(false);
    });

    test("14b. key-based with valid credentials → true and the account is active", async ({ page }) => {
        test.skip(!MONDAY_API_KEY, "set MONDAY_API_KEY in e2e/.env to run the valid-credentials half");
        await disconnect(cfg, "monday"); // clean slate
        const token = await mintSessionToken(cfg);
        const result = await connectKeybased(page, token, "monday", { api_token: MONDAY_API_KEY! });
        expect(result).toEqual({ ok: true, value: true });
        await expect.poll(() => isConnected(cfg, "monday"), { timeout: 15_000, intervals: [1000, 2000] }).toBe(true);
    });

    test.afterAll(async () => { await disconnect(cfg, "monday"); await disconnect(cfg, "auth0"); });

    test.fixme("15. key-based connector with an explicit type and no payload → a clear 'missing credentials' error [needs DEV-7912]", async () => {});
});
