import { test } from "@playwright/test";

/**
 * DEV-7914 — Multi-auth (cases 16–18): an app with has_multi_auth_enabled holding more than one
 * connection. Scaffolded as test.fixme; see e2e/README.md.
 */
test.describe("multi-auth", () => {
    test.fixme("16. with one connection present, add a second → the result doesn't resolve until consent is completed", async () => {});
    test.fixme("17. re-auth an existing connectionId → resolves after consent, same id and an updated connectedAt", async () => {});
    test.fixme("18. with two connections, disconnect(connectionId) removes only that one; disconnect() without one → 400", async () => {});
});
