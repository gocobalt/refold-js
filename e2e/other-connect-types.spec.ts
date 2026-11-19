import { test } from "@playwright/test";

/**
 * DEV-7914 — Other connect types (cases 13–15). Scaffolded as test.fixme; see e2e/README.md.
 * Case 15 depends on the SDK fix in DEV-7912 (explicit key-based types with no payload → /save).
 */
test.describe("other connect types", () => {
    test.fixme("13. client-credentials connector → no popup, result true, account active", async () => {});
    test.fixme("14. key-based: valid credentials → true; bad credentials → the server's error reaches the page", async () => {});
    test.fixme("15. key-based connector with an explicit type and no payload → a clear 'missing credentials' error [needs DEV-7912]", async () => {});
});
