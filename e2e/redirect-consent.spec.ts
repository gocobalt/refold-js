import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { isConnected, disconnectAll } from "./harness/refold-admin";
import { cfg, SLUG, ATLASSIAN_STATE, startConnect, awaitResult, grant } from "./harness/consent";

/**
 * DEV-7914 — redirect OAuth consent cases (1–6): complete a REAL provider consent in the popup.
 * Target: Jira. Refold's own UAT OAuth apps are in development mode (only their owner can grant),
 * so consent uses a BRING-YOUR-OWN published OAuth app wired as Jira's default auth profile — the
 * test account owns that app, so it can grant it. Needs the logged-in Atlassian session from the
 * `login` setup (storageState) and RUN_CONSENT=1. Shares the connect/consent helpers with the
 * multi-auth and session-lifecycle specs via e2e/harness/consent.ts.
 */
const stateExists = fs.existsSync(ATLASSIAN_STATE);

test.describe("redirect OAuth consent (Jira)", () => {
    test.skip(!process.env.RUN_CONSENT || !stateExists || !cfg.apiKey, "set RUN_CONSENT=1, REFOLD_API_KEY, and run `--project=login` first");
    test.use({ storageState: stateExists ? ATLASSIAN_STATE : undefined });

    test.beforeEach(async () => { await disconnectAll(cfg, SLUG); }); // clean slate (jira is multi-auth)
    test.afterAll(async () => { await disconnectAll(cfg, SLUG); });

    test("1. happy path: Connect → consent → callback → connect() resolves true; account active", async ({ page }) => {
        test.setTimeout(120_000); // real consent + redirect + the SDK's status polling
        const popupPromise = page.waitForEvent("popup");
        await startConnect(page);
        const popup = await popupPromise;
        await grant(popup);
        const result = await awaitResult(page);
        expect(result).toEqual({ ok: true, value: true });
        await expect.poll(() => isConnected(cfg, SLUG), { timeout: 20_000, intervals: [1000, 2000, 3000] }).toBe(true);
    });

    test("2. autoClose:false → resolves true and the popup stays open", async ({ page }) => {
        test.setTimeout(120_000);
        const popupPromise = page.waitForEvent("popup");
        await startConnect(page, { autoClose: false });
        const popup = await popupPromise;
        await grant(popup);
        const result = await awaitResult(page);
        expect(result).toEqual({ ok: true, value: true });
        expect(popup.isClosed(), "popup should stay open with autoClose:false").toBe(false);
        await popup.close(); // cleanup
    });

    // Needs a PKCE-grant app/connector (Jira is authorization_code) + its own published OAuth app.
    test.fixme("3. a PKCE-grant app → same result as case 1", async () => {});

    test("4. user denies consent → no account created; closing the popup resolves false", async ({ page }) => {
        test.setTimeout(120_000);
        const popupPromise = page.waitForEvent("popup");
        await startConnect(page);
        const popup = await popupPromise;
        await popup.getByRole("button", { name: /^cancel$/i }).click({ timeout: 30_000 });
        // The SDK trusts `closed` only after its first poll (POLL_INTERVAL = 3s) has seen the handle
        // alive; wait past that before closing, or the close is ignored and connect() waits 3 min.
        await popup.waitForTimeout(3500).catch(() => { /* popup may have navigated to the callback */ });
        if (!popup.isClosed()) await popup.close();
        const result = await awaitResult(page);
        expect(result).toEqual({ ok: true, value: false });
        expect(await isConnected(cfg, SLUG)).toBe(false);
    });

    test("5. user closes the popup before consenting → false", async ({ page }) => {
        test.setTimeout(120_000);
        const popupPromise = page.waitForEvent("popup");
        await startConnect(page);
        const popup = await popupPromise;
        // The SDK trusts `closed` only after its first poll (POLL_INTERVAL = 3s) has seen the handle
        // alive; wait past that before closing, or the close is ignored and connect() waits 3 min.
        await popup.getByRole("button", { name: /^accept$/i }).waitFor({ state: "visible", timeout: 30_000 }).catch(() => { /* best effort */ });
        await popup.waitForTimeout(3500);
        await popup.close();
        const result = await awaitResult(page);
        expect(result).toEqual({ ok: true, value: false });
        expect(await isConnected(cfg, SLUG)).toBe(false);
    });

    // Needs a provider that sends Cross-Origin-Opener-Policy: same-origin (e.g. Calendly) + its own app.
    test.fixme("6. provider sends COOP same-origin → completing consent true; abandoning false at timeout", async () => {});
});
