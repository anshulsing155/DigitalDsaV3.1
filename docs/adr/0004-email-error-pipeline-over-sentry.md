# ADR-0004 — Email-based client error reporting over Sentry SDK

**Status**: Accepted
**Date**: 2026-05-14
**Session**: S100

---

## Context

The architecture-evolution roadmap item `OBS-1` was originally written as "Sentry client error tracking" — adopt `@sentry/sveltekit`, configure DSN, wire up source map upload, gain industry-standard error reporting with grouping, breadcrumbs, and a hosted UI.

During S100 investigation, the actual production gap turned out to be smaller than the item assumed:

1. **`/api/errors/report`** endpoint already existed (`src/routes/api/errors/report/+server.ts`) — validates payload, IP rate-limits, calls `sendErrorAlert`.
2. **`sendErrorAlert`** infrastructure already existed (`src/lib/server/errorAlert.ts`) — 15-min per-fingerprint dedup, 30/hour global cap, structured HTML/text email delivery to `tech@digitaldsa.com`. Hardened over multiple sessions.
3. **`ErrorBoundary.svelte`** already listened for `window.error` + `unhandledrejection`, filtered noise, and POSTed to `/api/errors/report`. Wrapped routes: `(app)`, `dashboard`, landing.
4. **Server-side `handleError`** in `hooks.server.ts` already reported SSR errors through the same pipeline.

The only unclosed gap was `hooks.client.ts` — its `HandleClientError` hook only handled stale-chunk reloads and never forwarded SvelteKit-caught errors (load throws, render errors during hydration, navigation failures) to the reporting endpoint.

Adopting Sentry alongside this would add:

- New runtime dependency (`@sentry/sveltekit` plus its transitive tree)
- DSN management as a new environment variable (already 9+ secrets to rotate before launch — see SEC-7)
- Source map upload step in Vercel build (CI complexity)
- CSP changes to allow Sentry's ingestion endpoint (SEC-9 is intentionally deferred — `style-src 'unsafe-inline'` is still in place)
- A second observability surface the team must remember to check

The actual outcome the user wants is "see them in production." Both Sentry and the email pipeline achieve that.

## Decision

**OBS-1 closes by extending the existing `sendErrorAlert` email pipeline. `hooks.client.ts` now forwards SvelteKit-caught client errors to `/api/errors/report` using the same noise filter as `ErrorBoundary.svelte` and `navigator.sendBeacon` for unload-safe delivery.**

Sentry is not adopted at this time. The decision is reversible — swapping in `@sentry/sveltekit` later is a localized change (replace the `reportToServer()` body in `hooks.client.ts` and the equivalent in `ErrorBoundary.svelte`).

## Consequences

**Enables:**

- Zero new dependencies — `pnpm-lock.yaml` unchanged for OBS-1
- Zero new environment variables — no DSN, no auth token, no project ID
- Unified error inbox — SSR + client errors land in the same `tech@digitaldsa.com` inbox with the same email template, dedup, and rate-limit
- No CSP changes required — SEC-9 (`style-src` unsafe-inline removal) remains independently deferrable
- Faster ship — OBS-1 closed in one commit, not the catalogued 4 hours

**Accepts as trade-offs:**

- **No automatic error grouping.** Sentry groups by stack-trace fingerprint and shows you "this error has occurred 47 times this week." The email pipeline's fingerprint dedup is binary (15-min window: emailed or suppressed) — useful for noise control, not for triage of recurring issues.
- **No breadcrumbs / session replay.** Sentry can show the sequence of user actions leading up to the error. We have only the single `message + stack + path + userAgent` payload.
- **No release tagging / regression detection.** Sentry can flag errors that started after a specific deploy. We'd correlate manually via timestamps and `vercel deployments list`.
- **Volume scales the inbox.** Today, dedup + 30/hour global cap is sufficient. At higher traffic, email-as-monitoring becomes painful and Sentry's ingestion model wins.
- **No source map upload.** Stack frames in emails will reference minified chunk names. Today we accept this; if traces become impossible to read, source maps + a manual symbolication step can be added.

**Reversal path:**

When grouping or replay become valuable enough to justify the dependency, ADR-NNNN can supersede this one. The migration is:

1. `pnpm add @sentry/sveltekit`
2. Initialize Sentry in `hooks.client.ts` and `hooks.server.ts`
3. Replace `reportToServer()` body with `Sentry.captureException()` (or call both during a transition window)
4. Add `PUBLIC_SENTRY_DSN` to Vercel env vars
5. Update CSP to allow Sentry ingestion endpoint
6. Optional: add source map upload to Vercel build

Steps 1-3 are ~1 hour. Steps 4-6 add ~2 hours.

## Alternatives Considered

1. **Adopt Sentry immediately** — rejected for reasons in Context. Specifically: catalog's assumption of "no client error visibility today" was wrong; the email pipeline already exists and is tested. Adopting Sentry now adds dependency surface without proportionate user-facing benefit.

2. **PostHog / LogRocket / other** — same trade-offs as Sentry, no compelling differentiation for our use case (small team, low-volume, already on Vercel + Atlas + ImageKit).

3. **Roll a custom dashboard on top of the existing pipeline** — write errors to a MongoDB collection, build an admin UI. Possible but speculative; we don't yet know whether we miss grouping enough to justify the build. Defer until that pain materializes.

4. **Do nothing — leave `hooks.client.ts` gap open** — rejected. The framework-caught errors are real signal (load function throws, hydration errors) and the gap is small. Closing it is cheap.

## References

- Roadmap item: `OBS-1` in [`docs/ARCHITECTURE-EVOLUTION.md`](../ARCHITECTURE-EVOLUTION.md) — marked ✅ done in S100
- Implementation: commit `5b823d21` (`feat(observability): forward SvelteKit-caught client errors to /api/errors/report`)
- Related: `src/hooks.client.ts`, `src/lib/server/errorAlert.ts`, `src/lib/components/landing/ErrorBoundary.svelte`, `src/routes/api/errors/report/+server.ts`
- Related deferral: SEC-9 (`style-src 'unsafe-inline'` removal) — adopting Sentry would have forced this earlier
