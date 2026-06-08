---
type: adr
epic: SEC
status: active
last_verified: 2026-06-04
related_specs: []
related_adrs: [ADR-0017]
test_coverage: [src/lib/testing/__tests__/keepWarmEndpointSecretLock.test.ts, src/lib/testing/__tests__/billing/cronEndpointPathConvention.test.ts]
owner: tech@digitaldsa.com
---

# ADR-0030 — Single `CRON_SECRET` across all cron-pattern endpoints (including keep-warm)

**Status**: Accepted
**Date**: 2026-06-04
**Session**: S222

## Context

S219 (2026-06-03) wired a Vercel-Hobby cold-start mitigation: a lightweight keep-warm probe at `GET /api/health` that an external cron (cron-job.org) pings every few minutes to keep the function instance + MongoDB connection pool warm. The S219 design introduced a **second** auth secret for this endpoint:

- `env.HEALTH_PING_SECRET` — gates the Mongo `ping` work on `/api/health`
- Header name `x-warm-secret`
- Separate from the existing `env.CRON_SECRET` + `x-cron-secret` pattern that protects the 6 billing-cron endpoints under `/api/cron/*` (per ADR-0017).

S222 (2026-06-04) owner review identified this as redundant and requested unification. This ADR records the decision rationale and the architectural constraint that fell out of it.

## Decision

**Every cron-secret-gated endpoint — including the keep-warm probe — uses `env.CRON_SECRET` + the `x-cron-secret` header, and lives under `src/routes/api/cron/*`.**

Concretely for S222:

1. `/api/health` retired. `git mv` to `/api/cron/keep-warm` so it complies with the existing architectural lock (`cronEndpointPathConvention.test.ts`) which requires every `x-cron-secret`-using `+server.ts` file to live under `/api/cron/*`.
2. The endpoint reads `env.CRON_SECRET` and expects `request.headers.get('x-cron-secret')`. The retired names (`HEALTH_PING_SECRET`, `x-warm-secret`) are forbidden via the lock test `keepWarmEndpointSecretLock.test.ts`.
3. `scripts/setup-cron-jobs.mjs` auto-provisions the `keepwarm-health` entry on cron-job.org alongside the 6 existing billing crons. A single command (`node scripts/setup-cron-jobs.mjs`) provisions all 7. The shared `jobPayload()` accepts per-spec `requestMethodHttp` (`'GET'` | `'POST'`) and `requestTimeoutSec` overrides; keep-warm uses GET + 8s timeout vs the billing crons' POST + 60s.
4. `HEALTH_PING_SECRET` becomes dead env-var space — safe to unset on Vercel `rinn` (confirmed never set on Production, so no action required).

## Consequences

**Enables:**

- One secret to rotate across the entire cron surface (currently 7 entries).
- One header pattern — `x-cron-secret` — across all cron requests, simplifying Vercel function-log filtering.
- Future cron endpoints inherit auth + CSRF skip for free by virtue of living under `/api/cron/*` (per ADR-0017).
- The keep-warm cron is now auto-provisioned by the same idempotent script that handles billing crons. New operator setup is a single command.

**Prevents:**

- The "is this a cron?" question being method-dependent. Keep-warm is GET; billing crons are POST. Both being under `/api/cron/*` makes the contract uniform regardless of HTTP method.
- Drift between two parallel auth patterns. With one canonical pattern, contributors adding new cron-secret-gated endpoints follow the existing convention by default.
- Silent posture regression. Before this ADR, `HEALTH_PING_SECRET` was unset in production, so the anti-abuse gate evaluated `!undefined === true` → every random internet hit got the full Mongo ping. The unify replaces the unset-gate with the live `CRON_SECRET` gate; only the cron-job.org entry triggers the ping, everyone else gets `db: "skipped"`.

**Tradeoffs accepted:**

- **Shared blast radius.** A compromise of `CRON_SECRET` now affects 7 endpoints instead of 6. The defense-in-depth argument for separating uptime-probe from state-mutating crons is real but narrow — both secrets would have been stored in the same Vercel project and the same cron-job.org account, so realistic leak vectors (Vercel env-var dump, cron-job.org account compromise, function log dump) compromise everything regardless of how many secrets exist. The marginal extra exposure surface (~40× more HTTP requests carrying the secret via the every-4-minute keep-warm cron vs daily billing crons) is in TLS-encrypted transit, not in any additional log surface.
- **Architectural rigidity.** Future endpoints that want cron-secret auth but logically don't belong under `/api/cron/*` (none today) would either get an exemption to the lock test or a relocation. We accept this because the lock test's value (uniform skip-rule coverage in `hooks.server.ts`) outweighs the inflexibility cost.

## Alternatives Considered

**1. Keep `HEALTH_PING_SECRET` separate (status quo from S219).** Defense-in-depth argument: a leak of the keep-warm secret can't be replayed against billing endpoints. Rejected because both secrets live in the same Vercel project and the same cron-job.org account — the practical leak vectors compromise both equally. The theoretical isolation defends against a "keep-warm-specific" leak surface that's speculative. Operational cost of dual secrets (two env vars to rotate, two header names in logs, two cron-job.org configs to keep aligned) outweighs the speculative benefit.

**2. Keep `/api/health` URL but relax the architectural lock to exempt GET-only endpoints.** The CSRF rationale for the lock (POSTs to non-`/api/cron/*` paths silently 403) doesn't apply to GET. Rejected because the broader value of the lock is consistency: "cron-secret here = endpoint lives under `/api/cron/*`" is a one-line invariant for anyone reading the codebase. Making the rule method-aware introduces a "well, it depends" subclause that future contributors would have to internalize, and special-cases tend to accumulate.

**3. Move keep-warm to a separate auth pattern entirely (e.g., unauthenticated public probe).** Rejected because an unauthenticated probe burns Mongo ping work on every random crawler hit. The secret gate is the anti-abuse mechanism; removing it would make the endpoint a free DOS amplifier against Atlas's connection pool.

## References

- ADR-0017 — Cron endpoints under `/api/cron/*` prefix (the architectural lock this ADR honors)
- ADR-0027 — Defer Render adapter-node migration (related Hobby-tier cold-start mitigation)
- ADR-0029 — Two-phase submit + CSR-data-page pattern (parallel Hobby-tier hardening)
- `docs/runbooks/KEEP-WARM-CRON.md` — Operational setup walkthrough
- `scripts/setup-cron-jobs.mjs` — Auto-provisioning implementation
- `src/lib/testing/__tests__/keepWarmEndpointSecretLock.test.ts` — Lock test guarding this ADR's decisions
- `src/lib/testing/__tests__/billing/cronEndpointPathConvention.test.ts` — Architectural lock for cron-path placement
- CHANGELOG.md S222 entry (2026-06-04) — Implementation commit `a26db02f`
