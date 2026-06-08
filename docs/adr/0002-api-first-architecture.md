# ADR-0002 — API-first JSON endpoints rather than SvelteKit form actions

**Status**: Accepted
**Date**: 2026-05-14 (recorded retroactively — the decision was made earlier; this ADR captures the rationale)
**Session**: S98

---

## Context

SvelteKit ships with idiomatic patterns for server-rendered web apps: form actions (`<form action="?/submit">` + `+page.server.ts` `actions`), built-in CSRF protection (origin-vs-host header check), HTML-rendering error helpers (`error(404)`), and progressive enhancement (`use:enhance`).

These are good defaults for browser-only SvelteKit apps. **They are not viable for this codebase** because the same SvelteKit server must serve a Capacitor Android WebView in addition to web browsers.

Specifically:
- Capacitor WebView origin is `capacitor://localhost` (or `https://localhost`) — never matches the production host. SvelteKit's built-in CSRF rejects every request.
- Capacitor WebView can't reliably read httpOnly cookies set by SvelteKit in some Android versions and configurations
- Form actions assume HTML form POST → server-rendered response navigation. Native WebView clients expect JSON responses and handle navigation themselves
- `error(404, '...')` returns an HTML page by default — useless for JSON callers (the SPA-after-first-paint and the Capacitor app)
- The Android app pre-loads the SPA bundle and never does multipage navigation after that; SvelteKit form actions' progressive-enhancement story is irrelevant

The choice was made implicitly over multiple sessions of building the form/dashboard surface. This ADR records it explicitly so future contributors don't try to "fix" the non-idiomatic patterns.

## Decision

**We treat the SvelteKit server as a hybrid: SSR for the initial page shell + REST API (`/api/*` JSON endpoints) for everything else.** Specifically:

1. **Initial page load** uses SvelteKit's standard SSR + `+page.server.ts` `load` functions. Data ships inside the SSR HTML for first paint.
2. **All state-changing operations** go through JSON endpoints in `src/routes/api/*` invoked from the client via `secureFetch` (a custom wrapper that adds the CSRF token header). No form actions for production flows.
3. **Custom CSRF token** (`csrf-token` cookie + `X-CSRF-Token` request header echo) replaces SvelteKit's built-in origin-vs-host CSRF. Works for both web and Capacitor because the cookie path is the same.
4. **Custom response shape**: `apiOk(data)` / `apiError(message, status)` return `{ success: boolean, data?, error? }`. Client error handling uses one pattern regardless of HTTP status.
5. **Native token bridge**: `isNativePlatform(request)` returns access/refresh tokens in the JSON response body for Capacitor clients (which must then store them in `capacitor-secure-storage-plugin` per ADR-future-SEC-3). Web clients use httpOnly cookies only.
6. **Custom rate limiter** at `$lib/server/rateLimiter.ts` because SvelteKit doesn't ship one.
7. **Custom auth guards** at `$lib/server/guards.ts` (`requireRoleApi`, `requireTeamPermission`, etc.) because SvelteKit's auth is hook-based at the route boundary, not per-endpoint.

## Consequences

**Positive:**
- One API surface serves both web and Capacitor uniformly — no platform-specific server code
- Discriminated-union response shape gives client code one pattern to handle (no try/catch for thrown errors AND status-code checks AND body parsing)
- Token-in-body bridge enables native auth without depending on WebView cookie quirks
- Centralized helpers (apiOk, secureFetch, requireRoleApi, rateLimit, parseJsonBody) reduce per-endpoint code
- Future mobile platforms (iOS via Capacitor, possibly React Native rewrite) inherit the same API contract for free

**Negative:**
- More client-side code than a pure-SvelteKit app — each component manually manages loading/error states (mitigated by future ADR for TanStack Query adoption)
- Lose SvelteKit's progressive-enhancement for forms (the app requires JS — acceptable for an authenticated DSA tool, but a downside)
- Custom CSRF / rate-limit / guard stack means more code to maintain than using off-the-shelf libraries
- The mismatch between SvelteKit idiom and our pattern can confuse contributors familiar with vanilla SvelteKit

**Mitigations:**
- CLAUDE.md §15 documents the canonical patterns (`apiOk` etc.) prominently
- Protocols in `.claude/protocols/zod-migration.md` codify the per-endpoint hardening pass
- ARCHITECTURE-EVOLUTION items DX-4 and DX-5 track the migration of remaining inconsistent routes

## Alternatives Considered

### Alternative A — SvelteKit form actions everywhere, Capacitor adapts

Use SvelteKit's idiomatic patterns; make Capacitor work around the cookie/origin issues with a custom HTTP plugin and Capacitor-side form-submission adapter.

**Rejected because:**
- The platform adapter would have to live in two places (SvelteKit hooks + Capacitor plugin) and stay synchronized
- Form actions' "redirect to /success" pattern doesn't make sense for a SPA inside a WebView
- The CSRF dance becomes Capacitor-specific config that breaks every time Android's WebView updates
- Custom origin allowlist in SvelteKit's CSRF would have to whitelist `capacitor://localhost`, which weakens browser CSRF without solving the cookie issue

### Alternative B — Two backends (web SvelteKit + REST API for mobile)

Maintain SvelteKit for web and a separate REST API server (e.g., Express or Fastify) for the Capacitor app.

**Rejected because:**
- Doubles the surface to maintain, deploy, secure, and rotate credentials for
- Business logic would have to live in a shared package — most of the rule engine, schema composition, and payload building would duplicate or split awkwardly
- Two auth systems = two ways to get auth wrong
- Tests doubled (or shared via a complex mono-repo setup)
- For our scale (single-product, small team), this is operationally untenable

### Alternative C — REST API only, abandon SSR

Skip SvelteKit's SSR entirely; serve a static SPA from CDN and hit the API for everything.

**Rejected because:**
- SEO matters for the marketing/landing pages (rinn.in)
- First paint on slow connections benefits substantially from SSR (we measured ~400ms perceived-load improvement for SSR vs CSR on the form pages)
- SvelteKit's load functions are a real productivity win for initial data — abandoning SSR means rebuilding that on the client side
- Capacitor benefits from SSR too — the WebView gets HTML with data already in it, no second roundtrip

## References

- [`CLAUDE.md`](../../CLAUDE.md) §15 "Tooling Conventions" — the canonical helpers
- [`src/lib/server/apiResponse.ts`](../../src/lib/server/apiResponse.ts) — `apiOk`/`apiError`/etc.
- [`src/lib/server/guards.ts`](../../src/lib/server/guards.ts) — auth/permission helpers
- [`src/lib/server/rateLimiter.ts`](../../src/lib/server/rateLimiter.ts) — rate limiter
- [`src/lib/utils/csrf.ts`](../../src/lib/utils/csrf.ts) — `secureFetch` + CSRF token handling
- [`src/routes/api/auth/check-dsa/+server.ts`](../../src/routes/api/auth/check-dsa/+server.ts) — the `isNativePlatform()` token-bridge example
- [ARCHITECTURE-EVOLUTION items DX-2, DX-4, DX-5](../ARCHITECTURE-EVOLUTION.md) — the consistency-cleanup work to bring all 162 routes onto the same pattern
