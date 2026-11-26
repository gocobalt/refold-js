import { test, expect } from "@playwright/test";

/**
 * Not one of the 22 DEV-7914 cases — a smoke check that the browser harness itself works: the
 * bundled SDK loads and a Refold instance is constructed in the page. Provider-free, so this is the
 * one spec expected to pass while the 22 connect cases are still scaffolded (test.fixme).
 */
test("harness: the SDK bundle loads and Refold constructs in the page", async ({ page }) => {
    await page.goto("/?token=harness-dummy-token");
    const ready = await page.evaluate(() => {
        const w = window as unknown as { RefoldSDK?: { Refold?: unknown }; __refold?: { connect?: unknown } };
        return typeof w.RefoldSDK?.Refold === "function" && typeof w.__refold?.connect === "function";
    });
    expect(ready).toBe(true);
});
