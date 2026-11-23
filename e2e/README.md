# End-to-end connect tests (DEV-7914)

Real-browser Playwright tests of the SDK's `connect()` flow — popups, provider consent, callbacks and
polling — which the unit suite (`refold.test.mjs`, DEV-7913) can't cover. They drive the **actual SDK**:
the harness bundles `refold.ts` into a browser global (esbuild) and loads it in a host page that calls
`refold.connect()` on a real click, on chromium + webkit, against live UAT.

```
e2e/harness/build.mjs     esbuild: refold.ts → e2e/harness/refold.global.js (window.RefoldSDK.Refold)
e2e/harness/serve.mjs     zero-dependency static server for e2e/harness/ (Playwright webServer builds first)
e2e/harness/index.html    loads the bundle, constructs Refold from query params, wires a Connect button
e2e/harness/env.ts        loads e2e/.env; e2e/harness/refold-admin.ts mints tokens / lists / disconnects
playwright.config.ts      chromium + webkit; serial (shared linked account)
```

## Setup

```bash
npm install
npx playwright install chromium webkit
cp e2e/.env.example e2e/.env   # then fill it in
```

`e2e/.env` keys (see `.env.example`): `REFOLD_API_KEY` (all real cases), `JIRA_SITE_NAME` (case 9 +
consent), `MONDAY_API_KEY` (14b), `AUTH0_*` (13), and for the consent cases `ATLASSIAN_EMAIL/PASSWORD`
+ `JIRA_OAUTH_CLIENT_ID/SECRET`.

## Running

```bash
# No-login set — no provider account needed (harness smoke + 7, 8, 9, 13, 14). Skips cleanly if
# e2e/.env is absent.
npm run test:e2e

# Type-check the e2e sources (the main build only compiles refold.ts):
npm run typecheck:e2e
```

### The redirect-consent cases (1–6)

These complete a **real Jira OAuth consent** in the popup, so they need a logged-in Atlassian session
and are gated behind `RUN_CONSENT=1`. One-time setup below, then:

```bash
# 1) one-time, headed — log into Atlassian and save the session (.auth/atlassian-<target>.json)
RUN_CONSENT=1 npx playwright test --project=login --headed

# 2) run the consent specs BY PATH (not `npm run test:e2e`, which would re-run login and overwrite
#    the saved session)
RUN_CONSENT=1 npx playwright test e2e/redirect-consent.spec.ts
```

## One-time consent setup — bring-your-own OAuth app

Refold's own UAT OAuth apps are in **development mode**, so only their owner can grant them and no
external test account can complete consent. So consent uses a **QA-owned, published** Atlassian OAuth
app, wired as Jira's **default auth profile**. The `ATLASSIAN_EMAIL` account must OWN that app and the
`JIRA_SITE_NAME` Jira site.

1. **Atlassian** (developer.atlassian.com/console/myapps → OAuth 2.0 integration):
   - Permissions → Jira API → scopes `read:jira-work`, `write:jira-work`, `read:jira-user`.
   - Authorization → OAuth 2.0 (3LO) → Callback URL `https://uat.refold.ai/api/v1/jira/callback`.
   - **Distribution → Sharing: On** (this is what lifts the owner-only restriction).
   - Settings → copy Client ID + Secret into `JIRA_OAUTH_CLIENT_ID` / `JIRA_OAUTH_CLIENT_SECRET`.
2. **Refold** — create a default Jira auth profile pointing at that app (org-scope, so `x-api-key`
   only, no session token):
   ```
   POST {REFOLD_BASE_URL}/api/v2/public/auth-profile/jira
     headers: x-api-key, environment, cobalt-internal: true
     body: { "name": "e2e-byo-jira", "auth_type": "oauth2",
             "oauth2": { "client_id": "...", "client_secret": "...", "grant_type": "authorization_code" } }
   POST {REFOLD_BASE_URL}/api/v2/public/auth-profile/jira/{id}/default
   ```
   `GET {REFOLD_BASE_URL}/api/v1/jira/integrate` should then return an authorize URL whose `client_id`
   is your app's. Delete the profile to revert Jira to the platform app.

## What's implemented vs blocked

Implemented & green on UAT: **1, 2, 4, 5, 7, 8, 9, 13, 14** + harness smoke. Still fixme:
3 (PKCE app), 6 (COOP provider), 10/11/12 (Playwright doesn't block gesture-less popups), 15 (DEV-7912),
16/18 (need a second Jira site for two distinct connections), 17/21 (multi-auth re-auth &
disconnect/reconnect — land in #22), 19 (`/connect/<code>` minting), 20 (`getToken` 401-retry),
22 (dual-auth app). Caveats on 9 (field is in the encrypted `state`, not the URL; flat only) and
13 (Auth0 is keybased on UAT, so it exercises the keybased path, not `grantType`).
