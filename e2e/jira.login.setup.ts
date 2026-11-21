import { test as setup } from "@playwright/test";

/**
 * BLOCKED (2026-11-20): the Atlassian account available to QA enforces OTP that QA does not control
 * (it's a shared integrations account QA doesn't own), so this login can't be driven and the
 * redirect-consent cases (1–6, 16–17) stay fixme. This setup is ready for when QA owns a provider
 * account whose login is automatable (2FA off, or a TOTP seed in ATLASSIAN_TOTP_SECRET).
 *
 * Logs into Atlassian ONCE and saves the browser session (storageState), so the consent cases reuse
 * it instead of logging in every run — the pattern that keeps provider-login suites off the MFA /
 * bot-detection hot path. One Atlassian account covers both Jira and Confluence.
 *
 * First run headed, so a human can clear any MFA / new-device check:
 *   npx playwright test --config=playwright.config.ts --project=login --headed
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

    await page.context().storageState({ path: `.auth/atlassian-${TARGET}.json` });
});
