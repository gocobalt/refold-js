import { test } from "@playwright/test";

/**
 * DEV-7914 — Session and lifecycle (cases 19–22). Scaffolded as test.fixme; see e2e/README.md.
 */
test.describe("session and lifecycle", () => {
    test.fixme("19. a spent /connect/<code> link reloaded → a clear error; the same code in two tabs → the second fails cleanly", async () => {});
    test.fixme("20. getToken with a revoked token → the 401 retry gets a new token and the action succeeds", async () => {});
    test.fixme("21. disconnect → the account is gone → reconnecting works", async () => {});
    test.fixme("22. connector already connected through a different auth type → 409 reaches the page", async () => {});
});
