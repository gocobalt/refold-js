import { type Page } from "@playwright/test";
import { loadConfig } from "./env";
import { mintSessionToken } from "./refold-admin";

/**
 * Shared consent helpers (Jira) for the multi-auth and session-lifecycle specs. (redirect-consent.spec.ts
 * predates this extraction and keeps its own copies of cfg/startConnect/awaitResult/grant.) Consent uses a
 * bring-your-own published OAuth app wired as Jira's default auth profile (see e2e/README.md); the tests
 * run only with RUN_CONSENT=1 + the Atlassian storageState.
 */
export const cfg = loadConfig();
export const TARGET = (process.env.REFOLD_TARGET || process.env.TARGET || "uat").toLowerCase();
export const ATLASSIAN_STATE = `.auth/atlassian-${TARGET}.json`;
export const SLUG = process.env.JIRA_CONNECT_SLUG || "jira";
export const SITE = process.env.JIRA_SITE_NAME || "";

export type ConnectOutcome = { ok: true; value: boolean } | { ok: false; error: string };

/** Mint a token, open the harness, and kick off connect() without awaiting (resolves after consent). */
export async function startConnect(page: Page, extra: Record<string, unknown> = {}): Promise<void> {
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

/** The connect() result right now, or undefined if it hasn't resolved yet. */
export function peekResult(page: Page): Promise<ConnectOutcome | undefined> {
    return page.evaluate(() => (window as unknown as { __connectResult?: unknown }).__connectResult) as Promise<ConnectOutcome | undefined>;
}

/** Poll until connect() resolves (or a local timeout). */
export function awaitResult(page: Page, timeoutMs = 90_000): Promise<ConnectOutcome> {
    return page.evaluate((timeoutMs) => new Promise<{ ok: true; value: boolean } | { ok: false; error: string }>((res) => {
        const started = Date.now();
        const check = () => {
            const r = (window as unknown as { __connectResult?: { ok: true; value: boolean } | { ok: false; error: string } }).__connectResult;
            if (r !== undefined) return res(r);
            if (Date.now() - started > timeoutMs) return res({ ok: false, error: "timeout waiting for connect()" });
            setTimeout(check, 200);
        };
        check();
    }), timeoutMs);
}

/** Complete Atlassian's consent in the popup (signed in via storageState; site pre-selected). */
export async function grant(popup: Page): Promise<void> {
    await popup.waitForLoadState("domcontentloaded").catch(() => { /* already navigating */ });
    await popup.getByRole("button", { name: /^accept$/i }).click({ timeout: 30_000 });
}

/** Full connect → open popup → Accept → return the resolved result. */
export async function connectWithConsent(page: Page, extra: Record<string, unknown> = {}): Promise<ConnectOutcome> {
    const popupPromise = page.waitForEvent("popup");
    await startConnect(page, extra);
    const popup = await popupPromise;
    await grant(popup);
    return awaitResult(page);
}
