# ADR-0017 — Cron endpoints live under `/api/cron/*` prefix

**Status**: Accepted
**Date**: 2026-05-28
**Session**: 2026-05-27/28 mega-session continuation (D.1 S5 + SES bounce + S6-M1+M2 + architectural cleanups)

## Context

The CSRF middleware in `src/hooks.server.ts` (`validateCSRF`) skips state-changing requests when the URL path starts with `/api/cron/`. This skip was added 2026-05-27 morning to unblock cron-job.org POSTs that had been silently 403-ing across all `/api/cron/*` endpoints. The skip is safe because every cron handler MUST validate its own `x-cron-secret` header against `env.CRON_SECRET` before doing any work — so CSRF being off doesn't open new attack surface.

During the SES bounce SNS webhook smoke later in the same session, a routine `POST /api/billing/trial-reminder` returned **403** instead of the expected **401** (cron-secret mismatch) or **200**. Tracing the path: `/api/billing/trial-reminder` lives OUTSIDE the `/api/cron/*` prefix. The CSRF skip didn't apply, the middleware rejected the token-less request before the endpoint's own `x-cron-secret` check could fire.

The full latent footprint: four endpoints had this exact shape — structurally crons (gated by `headers.get('x-cron-secret')`) but located outside `/api/cron/*`:

| Path | Sends emails / does work |
|---|---|
| `/api/billing/trial-reminder` | Trial-expiry + renewal reminder emails |
| `/api/notifications/digest` | Daily unread-notification digest emails |
| `/api/pms/cron/renewal-check` | RM policy-access renewal reminders |
| `/api/pms/cron/publish-scheduled` | Scheduled policy publish |

None of these had a live cron-job.org job — they were silently CSRF-blocked from any external scheduler since shipped. The bug was dormant only because nobody had tried to wire them up.

Two ways to fix:

**Option A — Allowlist patch.** Add a small `CRON_LIKE_PATHS` array to `hooks.server.ts` listing the four affected paths, skip CSRF for those too. Mechanical, ~5 LOC, no test relocation.

**Option B — Architectural fix.** Move all four endpoints under `/api/cron/*` via `git mv` (preserves history). The existing CSRF skip then covers them by virtue of path placement. New cron contributors adding endpoints inherit the skip automatically.

## Decision

**Pick Option B — move all cron-secret endpoints under `/api/cron/*`.**

Specifically:

- `/api/billing/trial-reminder`     → `/api/cron/billing-trial-reminder`
- `/api/notifications/digest`       → `/api/cron/notifications-digest`
- `/api/pms/cron/renewal-check`     → `/api/cron/pms-renewal-check`
- `/api/pms/cron/publish-scheduled` → `/api/cron/pms-publish-scheduled`

A static-scan test (`src/lib/testing/__tests__/billing/cronEndpointPathConvention.test.ts`) locks the convention going forward: any `+server.ts` under `src/routes/api/` that reads `headers.get('x-cron-secret')` MUST live under `src/routes/api/cron/`. The detection is specifically the header read (not a `CRON_SECRET` string mention, which produces false positives — caught `admin/inactive-report` on the first iteration because it has the string in a comment but is admin-auth-gated rather than cron-secret-gated).

`routes.ts` `CRON_RENEWAL_CHECK` + `CRON_PUBLISH_SCHEDULED` constants updated to the new paths.

## Consequences

**Enables:**
- One canonical place to find every cron endpoint (`src/routes/api/cron/`)
- A new cron contributor adding an endpoint anywhere under that prefix inherits the CSRF skip + the static-scan invariant + (by naming convention) the cron-job.org provisioner pattern
- Operator-facing runbook gets a single regex (`/api/cron/*`) to map every cron URL — no per-feature allowlist to maintain

**Prevents:**
- The latent CSRF-blocked-cron bug class from recurring on future cron-shaped endpoints
- Special-case accretion in `hooks.server.ts` (the allowlist alternative would have grown over time)
- Path-shape inconsistency where some crons sit under `/api/cron/` and others sit elsewhere by accident of the original feature directory layout

**Accepted tradeoffs:**
- Route paths are no longer organized by feature area (e.g. PMS cron jobs sit under `/api/cron/pms-*` rather than `/api/pms/cron/*`). Feature locality is sacrificed for cross-cutting consistency. The path *prefix* names the cross-cutting concern (it's a cron); the path *suffix* names the feature.
- Existing cron-job.org jobs (none of these four had live jobs at the time of move) need updated URLs if wired later. No production scheduler breaks since none were live.
- Tests + internal callers referencing the old paths needed updating in the same commit. `routes.ts` was the only live internal caller (CRON_RENEWAL_CHECK + CRON_PUBLISH_SCHEDULED constants — neither was referenced anywhere else in `src/`).

## Alternatives Considered

- **Option A — allowlist patch in `hooks.server.ts`.** Faster (~5 LOC), zero test relocation, no route renames. Rejected because: (a) every future cron contributor must remember to add their new path to the allowlist or it silently CSRF-blocks; (b) the allowlist would grow over time, increasing the surface area for cross-cutting changes (e.g. if the skip logic ever changes shape); (c) the path-prefix convention is also a hint to operators wiring external schedulers — "if it's under `/api/cron/*`, it's hit-from-outside-with-cron-secret"; the allowlist hides that signal.

- **Option C — annotate cron endpoints with a per-file comment + parse the comment in middleware.** Considered for ~10 seconds and rejected. The static-scan test already detects header reads; pulling middleware logic into source-code-parsing makes the middleware itself harder to reason about. Path-based detection is the simplest stable signal.

- **Option D — leave the endpoints unmoved + accept they're admin-only.** Considered for the PMS cron endpoints (`renewal-check`, `publish-scheduled`) since they might be admin-triggered rather than scheduler-driven. Rejected because both files use `headers.get('x-cron-secret')` exclusively as their auth mechanism (no admin role check); they ARE designed as crons, just at the wrong path. The architectural fix matches their actual intent.

## References

- Commit `85eb2f50` — the four `git mv` operations + `routes.ts` update + static-scan lock-test (`cronEndpointPathConvention.test.ts`)
- Commit `ea9ebedf` — the morning's same-class CSRF-skip fix for `/api/cron/*` (where the prefix-skip was originally added)
- Companion test `src/lib/testing/__tests__/billing/cronCsrfSkip.test.ts` — locks the middleware-side skip rule
- Companion test `src/lib/testing/__tests__/billing/cronEndpointPathConvention.test.ts` — locks the route-placement convention
- `CHANGELOG.md` entry 2026-05-28 (post-midnight close of mega-session continuation)
