import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { cfg, SLUG, ATLASSIAN_STATE, connectWithConsent } from "./harness/consent";
import { disconnectAll, connectionsOf, isConnected, mintSessionToken } from "./harness/refold-admin";

/**
 * DEV-7914 — Session and lifecycle (cases 19–22). Case 21 is implemented (real consent on Jira via
 * the bring-your-own OAuth app auth profile); 19/20/22 stay fixme. RUN_CONSENT=1 + the Atlassian
 * storageState (see e2e/README.md).
 */
const stateExists = fs.existsSync(ATLASSIAN_STATE);

test.describe("session and lifecycle (Jira)", () => {
    test.skip(!process.env.RUN_CONSENT || !stateExists || !cfg.apiKey, "set RUN_CONSENT=1, REFOLD_API_KEY, and run `--project=login` first");
    test.use({ storageState: stateExists ? ATLASSIAN_STATE : undefined });

    test.beforeEach(async () => { await disconnectAll(cfg, SLUG); });
    test.afterAll(async () => { await disconnectAll(cfg, SLUG); });

    test.fixme("19. a spent /connect/<code> link reloaded → a clear error; same code in two tabs → the second fails cleanly", async () => {});
    test.fixme("20. getToken with a revoked token → the 401 retry gets a new token and the action succeeds", async () => {});

    test("21. disconnect removes the account; reconnecting works", async ({ page }) => {
        test.setTimeout(150_000);
        expect(await connectWithConsent(page)).toEqual({ ok: true, value: true });
        const id = (await connectionsOf(cfg, SLUG))[0]?.connection_id;
        expect(id, "no connection_id after connect").toBeTruthy();

        // Disconnect via the SDK (a multi-auth app needs the connectionId).
        const token = await mintSessionToken(cfg);
        await page.goto(`/?baseUrl=${encodeURIComponent(cfg.baseURL)}&token=${encodeURIComponent(token)}`);
        await page.evaluate(({ slug, id }) => {
            const w = window as unknown as { __refold: { disconnect: (s: string, t: undefined, o: { connectionId: string }) => Promise<unknown> } };
            return w.__refold.disconnect(slug, undefined, { connectionId: id }); // let a failed disconnect surface the server error
        }, { slug: SLUG, id: id as string });
        expect(await isConnected(cfg, SLUG), "account should be gone after disconnect").toBe(false);

        // Reconnecting works.
        expect(await connectWithConsent(page)).toEqual({ ok: true, value: true });
        expect(await isConnected(cfg, SLUG)).toBe(true);
    });

    test.fixme("22. connector already connected through a different auth type → 409 reaches the page", async () => {});
});
