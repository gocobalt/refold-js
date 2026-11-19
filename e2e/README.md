# End-to-end connect tests (DEV-7914)

Real-browser tests of the SDK's `connect()` flow — popups, provider consent, callbacks and polling —
which the unit suite (`refold.test.mjs`, DEV-7913) can't cover.

> **Status: scaffold.** The harness is in place and all 22 cases from DEV-7914 are laid out as
> `test.fixme` stubs, grouped per the ticket. Only `harness.spec.ts` (a provider-free smoke check
> that the SDK bundle loads in the page) is meant to run green today. Filling in the 22 cases needs a
> provider app + test account wired (see "Picking a provider" below) — chosen deliberately as a
> follow-up, so this PR is the foundation, not the coverage.

## How it works

The published package is CommonJS and can't be `import`ed in a page, so the harness **bundles the SDK
into a browser global** and loads it in a host page:

```
e2e/harness/build.mjs   esbuild: refold.ts → e2e/harness/refold.global.js (window.RefoldSDK.Refold)
e2e/harness/index.html  loads the bundle, constructs Refold from query params, wires a Connect button
e2e/harness/serve.mjs   zero-dependency static server for e2e/harness/ (Playwright webServer)
playwright.config.ts    chromium + webkit; serves the harness; serial (shared linked account)
```

A **real click** on the Connect button is a trusted user gesture, so `window.open` isn't
popup-blocked — essential for the "Popup activation" cases. Tests set `window.__connectParams` before
clicking; the no-gesture case (12) calls `window.__refold.connect()` from `page.evaluate` instead.

The host page reads `?baseUrl=`, `?token=`, `?code=` and `?slug=` so a test can point the SDK at a
target and authenticate with a minted session token or a `/connect/<code>`.

## Running

```bash
npm install                 # brings in @playwright/test + esbuild (devDeps)
npx playwright install      # browser binaries (chromium, webkit)
npm run test:e2e            # builds the bundle, then runs Playwright
```

## Picking a provider (to un-fixme the cases)

The cases split by what they need:

- **No provider login** — case 9 (inspect the authorize URL), 4/5/7/8 (open the popup, then
  abandon/deny/timeout/abort), 12 (POPUP_BLOCKED). These only need a target app whose authorize URL
  Refold can build (e.g. Confluence on UAT already has platform OAuth creds).
- **Provider login required** — cases 1, 3, 13, 14, 16, 17, 21, where the connection must actually
  become active. These need a real provider test account (and, for a custom OAuth app, a registered
  callback). Reuse the `storageState` login-amortization pattern to avoid MFA on the hot path.

Recommended first target: **Confluence / Atlassian** — Refold builds a real `auth.atlassian.com`
URL without us registering an OAuth app; only an Atlassian test account + site is needed for the
login-required cases.

## Dependencies

- Case 15 depends on the SDK fix in **DEV-7912** (explicit key-based types with no payload → `/save`).
- **DEV-7912** also wires `npm test` into CI; a Playwright CI job for this suite should be added
  alongside that, not here, to keep CI ownership in one place.
