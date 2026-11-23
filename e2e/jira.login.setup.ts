import { test as setup } from "@playwright/test";

/**
 * Logs into Atlassian ONCE and saves the browser session (storageState), so the redirect-consent
 * cases reuse it instead of logging in every run. After login it also visits the Jira site so the
 * session carries the site context the OAuth consent needs. One Atlassian account covers Jira + Confluence.
 *
 * Consent uses a BRING-YOUR-OWN published OAuth app (Refold's own UAT apps are dev-mode / owner-only).
 * The ATLASSIAN_EMAIL account must OWN that app and the JIRA_SITE_NAME site. See e2e/README.md.
 *
 * First run headed, so a human can clear any one-time device check:
 *   RUN_CONSENT=1 npx playwright test --project=login --headed
 * The saved state then carries that trust; later runs can go headless until it expires.
 */
setup.use({ trace: "off", screenshot: "off", video: "off" });

const TARGET = (process.env.REFOLD_TARGET || process.env.TARGET || "uat").toLowerCase();

function required(key: string): string {
    const value = process.env[key];
    if (!value) throw new Error(`Missing ${key} — add it to e2e/.env`);
    return value;
}

setup("atlassian provider login", async ({ page }) => {
    // Parked by default: the consent cases need a QA-owned provider account (see file header). This
    // login only runs when explicitly opted in, so it never false-passes or fails the normal suite.
    setup.skip(!process.env.RUN_CONSENT, "parked: set RUN_CONSENT=1 once QA owns an automatable provider account");
    setup.setTimeout(180_000); // headed login may need a human to clear MFA / device verification
    const email = required("ATLASSIAN_EMAIL");
    const password = required("ATLASSIAN_PASSWORD");

    await page.goto("https://id.atlassian.com/login");

    // Atlassian is identity-first: email, Continue, then the password on the next step. Fields are
    // labelled, not id'd, so select by role/label.
    await page.getByRole("textbox", { name: /email/i }).fill(email);
    await page.getByRole("button", { name: /continue/i }).click();

    const pwd = page.getByRole("textbox", { name: /password/i });
    await pwd.waitFor({ state: "visible", timeout: 30_000 });
    await pwd.fill(password);
    await page.getByRole("button", { name: /log in|continue/i }).click();

    // Fail fast on a rejected credential rather than waiting out the timeout.
    const badCreds = page.locator("text=/incorrect email or password|couldn't.*sign|try again/i");

    // Success = landed on an Atlassian app/home host (not the login/verify page). A challenge is
    // cleared by a human in headed mode; a trusted account/IP skips through.
    const outcome = await Promise.race([
        page.waitForURL(/(start|home|admin)\.atlassian\.com|\.atlassian\.net/i, { timeout: 90_000 })
            .then(() => "ok" as const).catch(() => "timeout" as const),
        badCreds.waitFor({ state: "visible", timeout: 90_000 }).then(() => "bad-creds" as const).catch(() => "timeout" as const),
    ]);
    if (outcome === "bad-creds") {
        throw new Error(`Atlassian rejected the credentials for ${email}. Check ATLASSIAN_EMAIL / ATLASSIAN_PASSWORD in e2e/.env.`);
    }

    // Warm the Jira site session while the login is live, so storageState carries the site context the
    // OAuth consent needs. Logging into id.atlassian.com alone leaves the consent reporting "no access".
    const site = process.env.JIRA_SITE_NAME;
    if (site) {
        await page.goto(`https://${site}.atlassian.net/jira`, { waitUntil: "domcontentloaded" }).catch(() => { /* SSO redirect chain */ });
        await page.waitForURL((u) => u.href.includes(`${site}.atlassian.net`), { timeout: 60_000 }).catch(() => { /* best effort */ });
        await page.waitForTimeout(4000);
    }

    await page.context().storageState({ path: `.auth/atlassian-${TARGET}.json` });
});
