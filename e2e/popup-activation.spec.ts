import { test } from "@playwright/test";

/**
 * DEV-7914 — Popup activation (cases 10–12). Run on WebKit/Safari too (playwright.config.ts) — popup
 * and user-gesture rules differ there. All three stay test.fixme; see the note on case 12.
 */
test.describe("popup activation", () => {
    test.fixme("10. page opened from a /connect/<code> link → click Connect immediately → the popup isn't blocked", async () => {});
    test.fixme("11. getToken with a short expires_in → page idle past expiry → click Connect → the popup isn't blocked", async () => {});

    // NOTE: not reproducible under Playwright as-is. A gesture-less window.open is NOT blocked here —
    // Playwright returns a real popup handle, so connect() proceeds to polling instead of raising
    // POPUP_BLOCKED (confirmed live: the test hit the wait timeout, not the error). The SDK's own
    // "window.open returns null → POPUP_BLOCKED" mapping is covered by the DEV-7913 unit test. Revisit
    // if we add a popup-blocking browser context.
    test.fixme("12. connect() called with no click (no user gesture) → POPUP_BLOCKED", async () => {});
});
