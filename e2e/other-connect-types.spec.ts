import { test, expect, type Page } from "@playwright/test";
import { loadConfig } from "./harness/env";
import { mintSessionToken, isConnected, disconnect } from "./harness/refold-admin";

/**
 * DEV-7914 — Other connect types (cases 13–15). Case 14 (key-based) is implemented against Monday
 * (key-based on UAT, field `api_token`) — a QA-controlled credential, so it needs no interactive
 * consent/OTP. Case 15 depends on the DEV-7912 SDK fix; case 13 needs a client-credentials connector.
 */
const cfg = loadConfig();
const SLUG = "monday";
const FIELD = "api_token";
const MONDAY_API_KEY = process.env.MONDAY_API_KEY;

type Outcome = { ok: true; value: boolean } | { ok: false; error: string };

async function connectKeybased(page: Page, token: string, apiToken: string): Promise<Outcome> {
    await page.goto(`/?baseUrl=${encodeURIComponent(cfg.baseURL)}&token=${encodeURIComponent(token)}`);
    return page.evaluate(async ({ slug, field, value }) => {
        const refold = (window as unknown as { __refold: { connect: (p: unknown) => Promise<boolean> } }).__refold;
        try { return { ok: true as const, value: await refold.connect({ slug, type: "keybased", payload: { [field]: value } }) }; }
        catch (e) {
            const err = e as { message?: string; error?: string };
            return { ok: false as const, error: err?.message ?? err?.error ?? JSON.stringify(e) };
        }
    }, { slug: SLUG, field: FIELD, value: apiToken });
}

test.describe("other connect types", () => {
    test.fixme("13. client-credentials connector → no popup, result true, account active", async () => {});

    test("14a. key-based with bad credentials → the server's error reaches the page", async ({ page }) => {
        const token = await mintSessionToken(cfg);
        const result = await connectKeybased(page, token, "invalid-token-xxxxxxxx");
        // The SDK throws the server's parsed error; connect() must not report success.
        expect(result.ok, `expected an error to reach the page, got ${JSON.stringify(result)}`).toBe(false);
    });

    test("14b. key-based with valid credentials → true and the account is active", async ({ page }) => {
        test.skip(!MONDAY_API_KEY, "set MONDAY_API_KEY in e2e/.env to run the valid-credentials half");
        await disconnect(cfg, SLUG); // clean slate
        const token = await mintSessionToken(cfg);
        const result = await connectKeybased(page, token, MONDAY_API_KEY!);
        expect(result).toEqual({ ok: true, value: true });
        await expect.poll(() => isConnected(cfg, SLUG), { timeout: 15_000, intervals: [1000, 2000] }).toBe(true);
    });

    test.afterAll(async () => { await disconnect(cfg, SLUG); });

    test.fixme("15. key-based connector with an explicit type and no payload → a clear 'missing credentials' error [needs DEV-7912]", async () => {});
});
