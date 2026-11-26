import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { cfg, SLUG, ATLASSIAN_STATE, connectWithConsent } from "./harness/consent";
import { disconnectAll, connectionsOf } from "./harness/refold-admin";

/**
 * DEV-7914 — Multi-auth (cases 16–18): jira is has_multi_auth_enabled. Real consent via the
 * bring-your-own OAuth app auth profile. RUN_CONSENT=1 + the Atlassian storageState (see e2e/README.md).
 *
 * 16 and 18 need TWO distinct connections, but one Jira site + one account dedups to a single
 * connection — they need a second Jira site/account to hold a distinct connection, so they stay fixme.
 */
const stateExists = fs.existsSync(ATLASSIAN_STATE);

test.describe("multi-auth (Jira)", () => {
    test.skip(!process.env.RUN_CONSENT || !stateExists || !cfg.apiKey, "set RUN_CONSENT=1, REFOLD_API_KEY, and run `--project=login` first");
    test.use({ storageState: stateExists ? ATLASSIAN_STATE : undefined });

    test.beforeEach(async () => { await disconnectAll(cfg, SLUG); });
    test.afterAll(async () => { await disconnectAll(cfg, SLUG); });

    // Needs a SECOND Jira site/account (two distinct connections); one site dedups to one connection.
    test.fixme("16. with one connection present, adding a second doesn't resolve until consent completes", async () => {});

    test("17. re-authing an existing connectionId forwards that id to /integrate and keeps the same connection", async ({ page }) => {
        test.setTimeout(150_000);
        expect(await connectWithConsent(page)).toEqual({ ok: true, value: true });
        const before = (await connectionsOf(cfg, SLUG))[0];
        const id = before?.connection_id;
        expect(id, "no connection_id after first connect").toBeTruthy();
        await page.waitForTimeout(1500); // so connectedAt is observably different

        // Capture what the SDK POSTs to /integrate on the re-auth. With one site + one account a plain
        // re-connect also yields one row with the same id and a newer connectedAt, so those three alone
        // don't prove the connectionId path — forwarding `connection_id` in the body is what only that
        // path produces (refold.ts connectTarget), and it's the SDK's responsibility.
        let reauthBody: Record<string, unknown> | undefined;
        await page.route("**/api/v1/*/integrate", async (route) => {
            reauthBody = route.request().postDataJSON() as Record<string, unknown>;
            await route.continue();
        });
        expect(await connectWithConsent(page, { connectionId: id })).toEqual({ ok: true, value: true });
        await page.unroute("**/api/v1/*/integrate");

        expect(reauthBody?.connection_id, "SDK must forward the connectionId to /integrate").toBe(id);
        const after = await connectionsOf(cfg, SLUG);
        expect(after.length, "re-auth should not create a new connection").toBe(1);
        expect(after[0].connection_id).toBe(id);
        expect(after[0].connectedAt).not.toBe(before.connectedAt);
    });

    // Needs TWO distinct connections (a second Jira site/account) — see note above.
    test.fixme("18. disconnect(connectionId) removes only that connection; disconnect() without one is refused", async () => {});
});
