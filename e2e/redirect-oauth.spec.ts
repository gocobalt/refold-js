import { test, expect, type Page } from "@playwright/test";
import { loadConfig } from "./harness/env";
import { mintSessionToken } from "./harness/refold-admin";

/**
 * DEV-7914 — Redirect OAuth (cases 1–9). Real browser, real popup, real provider consent.
 * Case 9 is implemented (Tier-1: needs only the API key — it inspects the authorize URL without
 * completing consent). Cases 1–8 need a provider test account (see e2e/README.md) and stay fixme.
 */
const cfg = loadConfig();
const SLUG = process.env.JIRA_CONNECT_SLUG || "jira"; // platform OAuth creds on UAT; required flat field site_name
// Any site_name yields an authorize URL (what the Tier-1 cases need); the real site matters only for
// the consent cases. Falls back to a placeholder when JIRA_SITE_NAME is unset.
const SITE = process.env.JIRA_SITE_NAME || "acme-qa-test";

/** Mint a fresh session token and open the harness page pointed at the target. */
async function openHarness(page: Page): Promise<void> {
    const token = await mintSessionToken(cfg);
    await page.goto(`/?baseUrl=${encodeURIComponent(cfg.baseURL)}&token=${encodeURIComponent(token)}`);
}

interface ConnectOpts { slug: string; site: string; timeout: number; abortAfterMs?: number }
type ConnectOutcome = { ok: true; value: boolean } | { ok: false; err: string };

/** Assert the auth popup ends up closed, tolerating the close being already done or still in flight. */
async function expectPopupClosed(popup: Page): Promise<void> {
    if (!popup.isClosed()) await popup.waitForEvent("close", { timeout: 10_000 }).catch(() => { /* fall to assert */ });
    expect(popup.isClosed()).toBe(true);
}

/** Drive refold.connect() in the page with a flat pre-req, a timeout, and an optional later abort. */
function connectInPage(page: Page, opts: ConnectOpts): Promise<ConnectOutcome> {
    return page.evaluate(async ({ slug, site, timeout, abortAfterMs }) => {
        const refold = (window as unknown as { __refold: { connect: (p: unknown) => Promise<boolean> } }).__refold;
        const params: Record<string, unknown> = { slug, type: "oauth2", payload: { site_name: site }, timeout };
        if (abortAfterMs !== undefined) {
            const ac = new AbortController();
            params.signal = ac.signal;
            setTimeout(() => ac.abort(), abortAfterMs);
        }
        try { return { ok: true as const, value: await refold.connect(params) }; }
        catch (e) { return { ok: false as const, err: (e as { code?: string })?.code ?? String((e as Error)?.message ?? e) }; }
    }, opts);
}

test.describe("redirect OAuth connect flow", () => {
    // Cases 1–6 (real provider consent) live in redirect-consent.spec.ts — they need a logged-in
    // provider session (HubSpot storageState) and the RUN_CONSENT gate.

    // Verified live: a short timeout with no user action opens the authorize popup, then the SDK
    // times out, closes it (autoClose) and resolves false. Needs only the authorize URL — no login.
    test("7. short timeout with no user action → resolves false and the popup closes", async ({ page }) => {
        await openHarness(page);
        const [popup, result] = await Promise.all([
            page.waitForEvent("popup"),
            connectInPage(page, { slug: SLUG, site: SITE, timeout: 2500 }),
        ]);
        expect(result).toEqual({ ok: true, value: false });
        await expectPopupClosed(popup);
    });

    // Verified live: timeout 0 (wait forever) + an AbortSignal fired after the popup opens → the SDK
    // gives up, closes the popup and resolves false. The only way out of an abandoned wait.
    test("8. aborting through an AbortSignal → false and the popup closes", async ({ page }) => {
        await openHarness(page);
        const [popup, result] = await Promise.all([
            page.waitForEvent("popup"),
            connectInPage(page, { slug: SLUG, site: SITE, timeout: 0, abortAfterMs: 1000 }),
        ]);
        expect(result).toEqual({ ok: true, value: false });
        await expectPopupClosed(popup);
    });

    // Verified live on UAT: the SDK forwards a flat pre-requisite field to /integrate and opens the
    // authorize URL the server returns. NOTE: the ticket's "the field appears in the authorize URL"
    // does NOT hold for Confluence — its site_name is carried in the encrypted `state`, not in the
    // visible query. Asserting the field literally in the URL needs an app that surfaces it there
    // (e.g. a subdomain-style field); that variant, and the nested pre_requisite_fields form, are
    // left for when such an app is wired (see e2e/README.md).
    test("9. forwards a flat pre-requisite field to /integrate and opens the provider authorize URL", async ({ page }) => {
        const token = await mintSessionToken(cfg);

        // Capture what the SDK POSTs to /integrate (its responsibility) and the URL it opens.
        let integrateBody: Record<string, unknown> | undefined;
        await page.route("**/api/v1/*/integrate", async (route) => {
            integrateBody = route.request().postDataJSON() as Record<string, unknown>;
            await route.continue();
        });

        await page.goto(`/?baseUrl=${encodeURIComponent(cfg.baseURL)}&token=${encodeURIComponent(token)}`);

        const openedUrl = await page.evaluate(async ({ slug, site }) => {
            const urls: string[] = [];
            // Returning null makes the SDK raise POPUP_BLOCKED after we've captured the URL — we only
            // want the authorize URL, not to drive consent.
            (window as unknown as { open: (u: string) => unknown }).open = (u: string) => { urls.push(u); return null; };
            try {
                await (window as unknown as { __refold: { connect: (p: unknown) => Promise<boolean> } })
                    .__refold.connect({ slug, type: "oauth2", payload: { site_name: site } });
            } catch { /* POPUP_BLOCKED after capture — expected */ }
            return urls[0] ?? null;
        }, { slug: SLUG, site: SITE });

        // The SDK forwarded the flat pre-req field to /integrate.
        expect(integrateBody, "SDK did not POST to /integrate").toBeTruthy();
        expect(integrateBody?.site_name).toBe(SITE);

        // The server returned a real provider authorize URL and the SDK opened it (for this slug).
        expect(openedUrl, "SDK did not open an authorize URL").toBeTruthy();
        expect(openedUrl).toMatch(/^https:\/\//);
        // The callback rides in the URL-encoded redirect_uri (…%2Fconfluence%2Fcallback), so decode.
        expect(decodeURIComponent(openedUrl!)).toContain(`/${SLUG}/callback`);
    });
});
