---
name: review-pr
description: Review a pull request for code quality, patterns consistency, and potential issues. Use when asked to review a PR by number or URL.
metadata:
  author: iamtraction
  version: "1.0.0"
  argument-hint: <pr-number-or-url>
---

# Review Pull Request

Perform a thorough code review of a GitHub pull request.

## Usage

The user provides a PR number or URL (e.g., `123`, `https://github.com/gocobalt/refold-js/pull/123`).

## Steps

1. **Fetch PR details** using `gh pr view {number} --json title,body,files,additions,deletions,baseRefName,headRefName`
2. **Fetch the diff** using `gh pr diff {number}`
3. **Analyze every changed file** against the checklist below
4. **Output a structured review** with findings grouped by severity

## Review Checklist

### SDK Design
- Zero runtime dependencies maintained — no new `dependencies` added to package.json
- Public API backward compatible — no breaking changes without major version bump
- Deprecated methods/fields marked with `@deprecated` JSDoc, not removed
- New public methods have JSDoc with `@param` and `@returns`
- New interfaces/types exported correctly
- Error handling follows existing pattern: throw parsed JSON for 4xx/5xx responses
- Native `fetch` API used — no axios, node-fetch, or other HTTP libraries
- OAuth popup flow: no changes that break `window.open()` + polling pattern

### Code Quality
- TypeScript strict mode passes — no `any` types unless truly unavoidable
- All public methods have explicit return types
- No unused imports or dead code
- No hardcoded URLs — base URL comes from constructor option
- Bearer token attached to all requests via `Authorization` header
- Pagination support: `page`/`limit` parameters where applicable

### Backward Compatibility
- Existing method signatures unchanged (or new optional params added at the end)
- Existing interfaces only extended, never fields removed
- `connected` and `auth_type` fields preserved (deprecated, not removed)
- AuthType enum values unchanged

### Security
- No secrets or tokens in code
- No `eval()`, `Function()`, or dynamic code execution
- Token not logged or exposed in error messages

### Naming & Style
- 4 spaces indentation, double quotes, semicolons
- camelCase for methods/variables, PascalCase for interfaces/types/enums
- Method names follow existing patterns: `get*`, `create*`, `update*`, `delete*`, `execute*`

## Output Format

```
## PR Review: #{number} — {title}

### Summary
Brief description of what the PR does.

### Critical Issues
- **[file:line]** Description of critical issue

### Suggestions
- **[file:line]** Description of improvement suggestion

### Nits
- **[file:line]** Minor style/preference issue

### Positive Notes
- Things done well worth calling out
```
