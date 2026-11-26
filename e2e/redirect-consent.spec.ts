import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { loadConfig } from "./harness/env";
import { mintSessionToken, isConnected, disconnectAll } from "./harness/refold-admin";

/**
 * DEV-7914 — redirect OAuth consent cases (1–6): complete a REAL provider consent in the popup.
 * Target: Jira. Refold's own UAT OAuth apps are in development mode (only their owner can grant),
 * so consent uses a BRING-YOUR-OWN published OAuth app wired as Jira's default auth profile — the
 * test account owns that app, so it can grant it. Needs the logged-in Atlassian session from the
 * `login` setup (storageState) and RUN_CONSENT=1.
 */
const cfg = loadConfig();
const TARGET = (process.env.REFOLD_TARGET || process.env.TARGET || "uat").toLowerCase();
const ATLASSIAN_STATE = `.auth/atlassian-${TARGET}.json`;
const SLUG = process.env.JIRA_CONNECT_SLUG || "jira";
const SITE = process.env.JIRA_SITE_NAME || "";
const stateExists = fs.existsSync(ATLASSIAN_STATE);

test.describe("redirect OAuth consent (Jira)", () => {
    test.skip(!process.env.RUN_CONSENT || !stateExists || !cfg.apiKey, "set RUN_CONSENT=1, REFOLD_API_KEY, and run `--project=login` first");
    test.use({ storageState: stateExists ? ATLASSIAN_STATE : undefined });

    test.beforeEach(async () => { await disconnectAll(cfg, SLUG); }); // clean slate (jira is multi-auth)
    test.afterAll(async () => { await disconnectAll(cfg, SLUG); });

    /** Kick off connect() in the page without awaiting (it only resolves after consent completes). */
    async function startConnect(page: Page, extra: Record<string, unknown> = {}): Promise<void> {
        const token = await mintSessionToken(cfg);
        await page.goto(`/?baseUrl=${encodeURIComponent(cfg.baseURL)}&token=${encodeURIComponent(token)}`);
        await page.evaluate(({ slug, site, extra }) => {
            const w = window as unknown as { __connectResult?: unknown; __refold: { connect: (p: unknown) => Promise<boolean> } };
            w.__connectResult = undefined;
            w.__refold.connect({ slug, type: "oauth2", payload: { site_name: site }, ...extra })
                .then((value) => { w.__connectResult = { ok: true, value }; })
                .catch((e) => { w.__connectResult = { ok: false, error: (e as { code?: string })?.code ?? String(e) }; });
        }, { slug: SLUG, site: SITE, extra });
    }

    /** Poll the page for connect()'s stored result. */
    function awaitResult(page: Page): Promise<{ ok: true; value: boolean } | { ok: false; error: string }> {
        return page.evaluate(() => new Promise<{ ok: true; value: boolean } | { ok: false; error: string }>((res) => {
            const started = Date.now();
            const check = () => {
                const r = (window as unknown as { __connectResult?: { ok: true; value: boolean } | { ok: false; error: string } }).__connectResult;
                if (r !== undefined) return res(r);
                if (Date.now() - started > 90_000) return res({ ok: false, error: "timeout waiting for connect()" });
                setTimeout(check, 200);
            };
            check();
        }));
    }

    /** Complete Atlassian's consent in the popup (signed in via storageState; site pre-selected). */
    async function grant(popup: Page): Promise<void> {
        await popup.waitForLoadState("domcontentloaded").catch(() => { /* already navigating */ });
        await popup.getByRole("button", { name: /^accept$/i }).click({ timeout: 30_000 });
    }

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
