# Plan: OAuth client-credentials (M2M) grant in `connect()`

## Goal

Let `connect()` complete an OAuth **client-credentials (machine-to-machine)**
connection in addition to the existing redirect grants (authorization_code /
PKCE). NetSuite is the first M2M connector. The server (`auth-service`,
gocobalt/refold#415) is already grant-aware; this SDK change adapts the client
without regressing the redirect flow.

## Constraints

- **No backend change.** `/integrate` is already merged: it reads redirect-grant
  pre-requisite fields from the query string and mints M2M tokens from a POST
  body. The SDK must fit that contract as-is.
- **Never put credentials in a URL.** An M2M private key / client secret must
  travel in a request body, never a query string (which leaks to access logs,
  history, and `Referer`).
- **Don't regress redirect grants.** `window.open()` must stay within one
  `await` of the user gesture or strict popup blockers fire (`POPUP_BLOCKED`).

## Design

Transport is chosen from an explicit, caller-supplied grant — not from a
pre-connect lookup or a field-name guess.

1. **`GrantType` enum** (`authorization_code` / `authorization_code_pkce` /
   `client_credentials`), exported like `AuthType` / `AuthStatus`. Type
   `Application.grant_type` and the new `OAuthParams.grantType` with it.
2. **`integrate(slug, params, grant)`** picks transport from `grant`:
   - `client_credentials` → `POST` with the fields in the JSON body.
   - otherwise → `GET` with query params (redirect pre-requisite fields), as before.
3. **`oauth()`** takes `grantType` and passes it straight to `integrate()`. It no
   longer calls `getApp()` before `window.open()` — restoring the single-`await`
   timing. A response with neither `auth_url` nor a boolean `connected` throws
   (`UNEXPECTED_INTEGRATE_RESPONSE`); the M2M contract is `{ connected: boolean }`.
4. **`connect()`** forwards `grantType`; because M2M is OAuth2 yet carries a
   payload, `grantType === ClientCredentials` routes to the OAuth path even when
   `type` is unset, so it is not mistaken for a key-based connect.

The connect portal (the caller) already holds the `Application` object, so it
passes `grant_type` through as `grantType` with no extra fetch.

## Files

- `refold.ts` — `GrantType` enum; `grant_type`/`grantType` typing;
  `integrate`/`oauth`/`connect` changes.
- `refold.js`, `refold.d.ts`, `docs/` — regenerated (`npm run build`, `docs`, `docs:llms`).
- `CLAUDE.md` — OAuth Flow (both paths), endpoint list (GET vs POST), Version History (v10.2).

## Verification

- `npm run build` (tsc, strict) clean.
- Redirect connectors: unchanged GET-with-query path; one `await` before `window.open`.
- M2M: POST body; no window; resolves the server's `connected`.
- No secret ever placed in a query string; no `private_key` heuristic; no
  error-swallowing `getApp` lookup.

## Rejected alternatives

- **Always POST to `/integrate`** (cleanest in principle): would need the merged
  backend to read redirect pre-requisite fields from the body — a backend change
  we're avoiding. Rejected in favour of grant-driven transport.
- **`private_key` field-name heuristic**: couples one connector's field naming to
  HTTP transport and misses M2M connectors that authenticate with a client
  secret. Removed.
