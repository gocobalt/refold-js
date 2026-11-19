import { test } from "@playwright/test";

/**
 * DEV-7914 — Redirect OAuth (cases 1–9). Real browser, real popup, real provider consent.
 * Scaffolded as test.fixme: fill in once a provider app + test account is wired (see e2e/README.md).
 * Cases 9 and 4/5/7/8 can run without completing consent (inspect the authorize URL / abandon the
 * popup); cases 1/3 need the connection to actually become active, so they need a provider login.
 */
test.describe("redirect OAuth connect flow", () => {
    test.fixme("1. happy path: Connect → popup → consent → callback → popup closes → connect() resolves true; account active", async () => {});
    test.fixme("2. autoClose:false → resolves true and the popup stays open", async () => {});
    test.fixme("3. a PKCE-grant app or connector → same result as case 1", async () => {});
    test.fixme("4. user denies consent → no account created; closing the popup resolves false within ~9s", async () => {});
    test.fixme("5. user closes the popup before consenting → false within ~9s", async () => {});
    test.fixme("6. provider sends COOP same-origin (e.g. Calendly): completing consent → true; abandoning → false only at timeout", async () => {});
    test.fixme("7. short timeout with no user action → the popup closes and the result is false", async () => {});
    test.fixme("8. aborting through an AbortSignal → false and the popup closes", async () => {});
    test.fixme("9. pre-requisite fields, both flat and nested, appear in the authorize URL", async () => {});
});
