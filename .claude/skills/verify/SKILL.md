---
name: verify
description: Verify code quality, catch bugs, and validate implementation against codebase patterns. Use for testing, linting, type-checking, and manual review.
metadata:
  author: iamtraction
  version: "1.0.0"
  argument-hint: <file-path-or-feature>
---

# Verify & Test

Perform comprehensive verification of code changes.

## Usage

The user provides a file path, feature name, or asks to verify recent changes. If no argument, verify all uncommitted changes.

## Verification Steps

### 1. Static Analysis
Run these checks and report results:
```bash
npm run build         # TypeScript compilation → refold.js + refold.d.ts
```

### 2. Type Safety Review
- Check for `any` types that should be properly typed
- Verify all public methods have explicit return types
- Ensure interface fields match the backend API responses
- Verify generic type parameters on Promise return types
- Check that deprecated fields are still present with `@deprecated` JSDoc

### 3. SDK Design Compliance
Verify the code follows SDK conventions:
- **Zero dependencies**: No runtime dependencies added
- **Native fetch**: No HTTP libraries — uses `fetch` API only
- **Single class**: All public API on the `Refold` class
- **Error handling**: 4xx/5xx → parse JSON → throw (no swallowing errors)
- **JSDoc on all public methods**: `@param`, `@returns` tags
- **Backward compatibility**: No removed methods/fields, no changed signatures

### 4. Runtime Safety Review
Check for common issues:
- **Missing error checks** — `res.status >= 400` not checked after fetch
- **OAuth polling** — `setInterval` properly cleaned up with `clearInterval`
- **Popup handling** — `window.open` result checked for null (popup blocked)
- **Token usage** — `this.token` attached to all requests
- **Base URL** — uses `this.baseUrl`, no hardcoded URLs

### 5. Backward Compatibility Check
- Existing method signatures unchanged
- Existing interfaces only extended (no field removal)
- Enum values unchanged
- `getApp()` overload still works for both single and all apps

## Output Format

```
## Verification Report

### Build: PASS/FAIL
Details...

### Type Safety: X issues found
- [file:line] Description

### SDK Design: X issues found
- [file:line] Description

### Runtime Safety: X issues found
- [file:line] Description

### Backward Compatibility: X issues found
- [file:line] Description

### Overall: PASS / NEEDS FIXES
Summary and recommended actions.
```

## Important

- Always run `npm run build` — don't skip compilation check
- Verify both `refold.js` and `refold.d.ts` are generated correctly
- Be specific about issues — include file paths and line numbers
- Breaking changes require major version bump — flag them as critical
