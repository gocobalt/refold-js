import { test, expect } from "@playwright/test";
import { loadConfig } from "./harness/env";
import { mintSessionToken } from "./harness/refold-admin";

/**
 * DEV-7914 — Redirect OAuth (cases 1–9). Real browser, real popup, real provider consent.
 * Case 9 is implemented (Tier-1: needs only the API key — it inspects the authorize URL without
 * completing consent). Cases 1–8 need a provider test account (see e2e/README.md) and stay fixme.
 */
const cfg = loadConfig();
const SLUG = "confluence"; // platform OAuth creds on UAT; required flat field site_name
const SITE = "acme-qa-test";

test.describe("redirect OAuth connect flow", () => {
    test.fixme("1. happy path: Connect → popup → consent → callback → popup closes → connect() resolves true; account active", async () => {});
    test.fixme("2. autoClose:false → resolves true and the popup stays open", async () => {});
    test.fixme("3. a PKCE-grant app or connector → same result as case 1", async () => {});
    test.fixme("4. user denies consent → no account created; closing the popup resolves false within ~9s", async () => {});
    test.fixme("5. user closes the popup before consenting → false within ~9s", async () => {});
    test.fixme("6. provider sends COOP same-origin (e.g. Calendly): completing consent → true; abandoning → false only at timeout", async () => {});
    test.fixme("7. short timeout with no user action → the popup closes and the result is false", async () => {});
    test.fixme("8. aborting through an AbortSignal → false and the popup closes", async () => {});

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
