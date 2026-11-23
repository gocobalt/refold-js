import { defineConfig, devices } from "@playwright/test";
import { loadDotEnv } from "./e2e/harness/env";

// Load e2e/.env so specs can read REFOLD_* (base URL, API key, linked account) for the real cases.
loadDotEnv();

/**
 * DEV-7914 — end-to-end tests of the SDK's connect flow in a real browser.
 *
 * The suite loads the built SDK into a host page (e2e/harness) and drives `refold.connect()`
 * through real popups and provider consent — things unit tests can't cover. WebKit is included
 * because popup activation and COOP behave differently there (ticket's "Popup activation" group).
 */
const PORT = Number(process.env.E2E_PORT || 5714);

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: false,
    workers: 1, // these flows touch a shared linked account; keep them serial
    timeout: 60_000,
    reporter: [["list"]],
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: "off", // the authorize URL and tokens are sensitive; keep traces off
    },
    webServer: {
        // Rebuild the SDK bundle before serving, so running a spec directly (not just `npm run test:e2e`)
        // never tests a stale or missing e2e/harness/refold.global.js.
        command: "node e2e/harness/build.mjs && node e2e/harness/serve.mjs",
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        env: { E2E_PORT: String(PORT) },
    },
    projects: [
        // Atlassian login that saves storageState for the consent cases (skipped unless RUN_CONSENT=1, so
        // it never runs in the default `npm run test:e2e`). Run it on its own, first time headed:
        //   RUN_CONSENT=1 npx playwright test --project=login --headed
        // Then run the consent specs by path (NOT via `npm run test:e2e`, which would re-run login and
        // overwrite the session): RUN_CONSENT=1 npx playwright test e2e/redirect-consent.spec.ts ...
        { name: "login", testMatch: /jira\.login\.setup\.ts/, use: { ...devices["Desktop Chrome"] } },
        { name: "chromium", testIgnore: /\.login\.setup\.ts/, use: { ...devices["Desktop Chrome"] } },
        { name: "webkit", testIgnore: /\.login\.setup\.ts/, use: { ...devices["Desktop Safari"] } },
    ],
});
