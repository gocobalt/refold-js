import { test } from "@playwright/test";

/**
 * DEV-7914 — Popup activation (cases 10–12). Run on WebKit/Safari too (configured in
 * playwright.config.ts) — popup-blocker and user-gesture rules differ there. Scaffolded as
 * test.fixme; see e2e/README.md.
 */
test.describe("popup activation", () => {
    test.fixme("10. page opened from a /connect/<code> link → click Connect immediately → the popup isn't blocked", async () => {});
    test.fixme("11. getToken with a short expires_in → page idle past expiry → click Connect → the popup isn't blocked", async () => {});
    test.fixme("12. connect() called with no click (no user gesture) → POPUP_BLOCKED", async () => {});
});
