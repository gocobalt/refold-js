---
name: style
description: Code style and formatting conventions for this codebase. Reference this when writing or reviewing code to ensure consistency.
metadata:
  author: iamtraction
  version: "1.0.0"
  user-invocable: false
---

# Code Style Guide

These conventions apply to all code written in this codebase. Follow them when creating, modifying, or reviewing code.

## Formatting

- **Indentation:** 4 spaces — never tabs
- **Quotes:** Double quotes for strings
- **Semicolons:** Always
- **Line endings:** Unix (LF)
- **Trailing commas:** Use trailing commas in multiline arrays, objects, function parameters, and imports
- **Blank lines:** One blank line between top-level declarations (imports, interfaces, functions, exports). No multiple consecutive blank lines.
- **Braces:** Opening brace on the same line (`if (...) {`), closing brace on its own line
- **Bracket spacing:** Spaces inside object braces — `{ key: value }`, not `{key: value}`
- **Template literals:** Prefer template literals over string concatenation

## Naming

- **Functions/variables:** camelCase — `getApp`, `executeWorkflow`, `configId`
- **Constants:** SCREAMING_SNAKE_CASE for true constants
- **Interfaces/Types:** PascalCase, no `I` prefix — `Application`, `Config`, `Execution`
- **Enums:** PascalCase name, PascalCase members — `AuthType.OAuth2`, `AuthStatus.Active`
- **Booleans:** Prefix with `is`, `has`, `can`, `should` — `isConnected`, `hasToken`

## TypeScript

- **Strict typing:** Avoid `any` — use `unknown` when the type is genuinely unknown, then narrow
- **Interfaces over types:** Prefer `interface` for object shapes, `type` for unions, intersections, and utility types
- **Explicit return types:** Add them for all public methods — this is a published SDK, types are the API contract
- **Non-null assertions:** Avoid `!` — prefer optional chaining (`?.`) and nullish coalescing (`??`)

## SDK-Specific Conventions

- **Zero dependencies:** This SDK has no runtime dependencies. Do not add any. Use native `fetch` API.
- **Single class:** All public API lives on the `Refold` class. Keep it that way.
- **Backward compatibility:** Mark deprecated fields/methods with `@deprecated` JSDoc tag — never remove them without a major version bump
- **Error propagation:** Throw parsed JSON error responses for 4xx/5xx — don't catch and transform in the SDK. Let consumers handle errors.
- **JSDoc on all public methods:** Every public method must have a JSDoc block with `@param` and `@returns` tags. This generates the TypeDoc documentation.

## Functions

- **Method style:** Use class methods for the `Refold` class
- **Private methods:** Mark with `private` keyword — `private oauth(...)`, `private keybased(...)`
- **Async/await:** All API calls are async — use `async`/`await`, never raw `.then()` chains in new code
- **Early returns:** Prefer early returns to reduce nesting

## Error Handling

- **Fetch errors:** Check `res.status >= 400 && res.status < 600`, parse JSON, throw it
- **No try/catch in SDK methods** — let errors propagate to the consumer
- **OAuth polling:** Catch errors in the polling interval and log to console — don't reject the promise on transient failures

## Comments

- **JSDoc for all public API** — every exported method, interface, enum, and type
- **No obvious comments** — don't describe what the code does when it's self-evident
- **Why, not what** — comment the reasoning, not the mechanics
- **No commented-out code** — delete it; git has history
