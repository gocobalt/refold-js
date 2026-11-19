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
        command: "node e2e/harness/serve.mjs",
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        env: { E2E_PORT: String(PORT) },
    },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "webkit", use: { ...devices["Desktop Safari"] } },
    ],
});
