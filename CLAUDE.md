# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Refold JS SDK (`@refoldai/refold-js`) — a zero-dependency TypeScript frontend SDK for integrating with the Refold platform. Provides methods for application connection (OAuth2 + key-based), configuration management, workflow execution, and execution monitoring. Published to npm as a public package. Single-file library (`refold.ts`, ~970 lines).

## Commands

```bash
npm run build          # Compile TypeScript (tsc) → refold.js + refold.d.ts
npm run docs           # Generate TypeDoc HTML documentation
npm run docs:llms      # Generate LLM-optimized markdown docs (docs/llms.txt)
```

No test runner is configured. No runtime dependencies.

## Build Output

- `refold.js` — Compiled CommonJS module (main entry point)
- `refold.d.ts` — TypeScript type definitions
- `docs/` — Generated TypeDoc documentation (HTML + `llms.txt`)

Published to npm (`@refoldai/refold-js`) and served via jsDelivr CDN.

## Architecture

### Single-Class Design
The entire SDK is a single `Refold` class using native `fetch` API. No external dependencies.

### Authentication
- Bearer token auth via `Authorization` header on all requests
- Token set via constructor option or `refold.token = "..."` after initialization
- Default base URL: `https://app.refold.ai` (configurable via `baseUrl` option)

### Public API

**Constructor:**
```typescript
const refold = new Refold({ token?: string, baseUrl?: string })
```

**Application Management:**
- `getApp(): Promise<Application[]>` — Get all enabled apps
- `getApp(slug: string): Promise<Application>` — Get specific app
- `getApps(): Promise<Application[]>` — Alias for getApp()

**Connection:**
- `connect({ slug, type?, payload?, grantType?, autoClose?, timeout? }): Promise<boolean>` — Connect app (OAuth2 redirect popup, OAuth2 client-credentials/M2M, or key-based POST). `grantType` (an exported `GrantType`) selects the OAuth transport: `client_credentials` submits the fields to the server and returns without opening a window; omit (or a redirect grant) uses the popup flow. Passing `grantType: GrantType.ClientCredentials` routes to the OAuth path even when a payload is present. `autoClose` (default `true`) closes the OAuth popup on success; `timeout` (default 5 minutes, `0` to wait indefinitely) caps the OAuth popup wait. `autoClose`/`timeout` apply only to the redirect popup flow. Param type: exported `ConnectParams` (extends `OAuthParams`).
- `disconnect(slug, type?, kind?): Promise<unknown>` — Disconnect app

**Universal connectors:** connectors (`Application.kind === "universal_connector"`) authenticate through their own endpoints under `/api/v1/auth-service/f-sdk/universal-connector/:slug` — `integrate` (OAuth), `save-credentials` (key-based), `revoke` (disconnect) — instead of the native/custom app routes. `connect()`/`disconnect()` route on `kind`: pass it (an exported `ConnectorKind`, from the app object) to skip the lookup, or omit it and the SDK resolves the kind via `getApp(slug)`. A failed lookup falls back to the native path so an unrelated outage can't misroute a native connect.

**Configuration:**
- `config(payload): Promise<Config>` — Create/get config
- `getConfigs(slug): Promise<{ config_id }[]>` — List configs
- `getConfig(slug, configId?): Promise<Config>` — Get specific config
- `updateConfig(payload): Promise<Config>` — Update config
- `deleteConfig(slug, configId?): Promise<unknown>` — Delete config
- `getConfigField(slug, fieldId, workflowId?): Promise<Config>` — Get field
- `updateConfigField(slug, fieldId, value, workflowId?): Promise<Config>` — Update field
- `deleteConfigField(slug, fieldId, workflowId?): Promise<unknown>` — Delete field
- `getFieldOptions(lhs, slug, fieldId, workflowId?): Promise<RuleOptions>` — Rule engine options

**Workflows:**
- `getWorkflows(params?): Promise<PaginatedResponse<PublicWorkflow>>` — List workflows
- `createWorkflow(params): Promise<PublicWorkflow>` — Create workflow
- `deleteWorkflow(workflowId): Promise<unknown>` — Delete workflow
- `getWorkflowPayload(workflowId): Promise<WorkflowPayloadResponse>` — Get payload schema
- `executeWorkflow(options): Promise<unknown>` — Execute workflow

**Executions:**
- `getExecutions({ page?, limit? }?): Promise<PaginatedResponse<Execution>>` — List executions
- `getExecution(executionId): Promise<Execution>` — Get execution details

### Key Types

```typescript
enum AuthType { OAuth2 = "oauth2", KeyBased = "keybased" }
enum AuthStatus { Active = "active", Expired = "expired" }
enum GrantType { AuthorizationCode = "authorization_code", AuthorizationCodePKCE = "authorization_code_pkce", ClientCredentials = "client_credentials" }
```

**Application** — app_id, name, slug, icon, tags, `grant_type` (`GrantType`, absent ⇒ authorization_code), auth_type_options, connected_accounts (with status)
**Config** — slug, config_id, fields (ConfigField[]), workflows (ConfigWorkflow[]), field_errors
**Execution** — status (COMPLETED/RUNNING/ERRORED/STOPPED/STOPPING/TIMED_OUT), nodes with node_status, completion_percentage

### OAuth Flow
The `/integrate` call is grant-driven, keyed off the caller-supplied `grantType`; there is no pre-connect `getApp` lookup (a second round-trip before `window.open` tripped strict popup blockers).

**Redirect grants (authorization_code / PKCE — the default):**
- `GET /api/v1/{slug}/integrate?<params>` returns `{ auth_url }`. Fields ride in the query string (non-secret pre-requisite fields only).
- Opens popup via `window.open(auth_url)`; if the popup is blocked, rejects immediately with an `Error` carrying `code: "POPUP_BLOCKED"`
- Polls `/api/v2/f-sdk/application/{slug}` every 3 seconds (one in-flight check at a time; up to 3 consecutive polling failures are tolerated before rejecting with the first error of the streak)
- Resolves `true` when `connected_accounts` shows an active OAuth connection (closes the popup unless `autoClose: false`)
- Resolves `false` after the window closes or the `timeout` elapses (closing the popup on timeout unless `autoClose: false`) — in both cases polling continues for a 6-second grace period first, since the connection may complete moments around the close/cutoff

**Client credentials (M2M — `grantType: GrantType.ClientCredentials`):**
- `POST /api/v1/{slug}/integrate` with the fields in the JSON **body** (so a private key / client secret never rides in a URL). No window is opened and no polling occurs.
- The server mints the token and returns `{ connected: boolean }`; `connect()` resolves that value.
- A response carrying neither `auth_url` nor a boolean `connected` throws an `Error` tagged `code: "UNEXPECTED_INTEGRATE_RESPONSE"`.

### Error Handling
All 4xx/5xx HTTP responses throw the parsed JSON error response. No try/catch in SDK — errors propagate to caller. Two OAuth-flow exceptions: a blocked popup rejects with a plain `Error` tagged `code: "POPUP_BLOCKED"`, and connection-status polling tolerates up to 3 consecutive errors (logged via `console.error`) before rejecting.

### Backend API Endpoints Used
All requests include `Authorization: Bearer ${token}`:
- Auth service: `/api/v3/org/basics`, `/api/v2/public/linked-account`
- Apps: `/api/v2/f-sdk/application`, `/api/v1/{slug}/integrate` (**GET** for redirect grants → `{ auth_url }`; **POST** with a JSON body for `client_credentials`/M2M → `{ connected }`), `/api/v2/app/{slug}/save`
- Config: `/api/v2/f-sdk/config`, `/api/v2/f-sdk/slug/{slug}/config/{configId}`, `/api/v2/public/config/field/{fieldId}`
- Workflows: `/api/v2/public/workflow`, `/api/v2/public/workflow/{id}/execute`
- Executions: `/api/v2/public/execution`

### Browser & Node Compatibility
- **Browser:** Uses native `fetch`, `window.open()` for OAuth popups, `setInterval` for polling
- **Node.js:** Works in Node 18+ (native fetch). No browser APIs called in non-OAuth flows.

## TypeScript Configuration

- Target: ES6, Module: CommonJS
- Strict mode enabled
- Declarations emitted (`refold.d.ts`)
- LF line endings enforced

## Version History

- **v10.2:** OAuth `client_credentials` (M2M) grant on `connect()` — `grantType` selects transport: M2M POSTs fields in the body and returns `{ connected }` with no popup; redirect grants keep the GET popup flow. Added exported `GrantType` enum and `Application.grant_type`.
- **v10.x:** Rebranded to `@refoldai/refold-js`; added `autoClose` and `timeout` options to `connect()`, OAuth polling hardening (popup-block fail-fast, failure tolerance, post-close grace)
- **v9.x:** Added `getWorkflowPayload()`, `executeWorkflow()`, multi-auth support
- **v8.x:** Introduced `AuthType` enum for multi-auth
- Deprecated fields maintained for backward compatibility

## Claude Code Skills

All development using Claude Code must use the superpowers skills plugin. Required before every task:

- **Before building features or components:** invoke `superpowers:brainstorming` to explore intent and design first
- **Before multi-step implementation:** invoke `superpowers:writing-plans` — this saves a plan to `docs/superpowers/plans/`
- **Before claiming work is done:** invoke `superpowers:verification-before-completion` before committing or opening a PR

For feature work (`feat/*` branches), include the plan file from `docs/superpowers/plans/` in the PR. PRs without a plan file for feature branches will receive a warning from the PR validation bot.
