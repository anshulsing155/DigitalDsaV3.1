---
type: adr
epic: PERF
status: active
last_verified: 2026-06-03
related_specs: []
related_adrs: [ADR-0027]
test_coverage: [src/lib/testing/__tests__/billing/upgradePromptWiring.test.ts]
owner: tech@digitaldsa.com
---

# ADR-0029 — Two-phase submit + CSR-data-page pattern for Vercel Hobby compatibility

**Status**: Accepted
**Date**: 2026-06-03
**Session**: S220

## Context

DigitalDSA runs on Vercel's free Hobby plan, which caps every serverless function at a **hard 10-second execution limit**. On 2026-06-03 (S220) the user reported persistent `504 GATEWAY_TIMEOUT` errors on two distinct surfaces, both stemming from this cap:

1. **`POST /api/evaluate-and-persist`** (form submit) — single endpoint did validation + subscription gate + QBC quota gate + payload build + case insert + form snapshot encrypt + rule engine evaluation (~30 lenders) + lender results persist. Cumulative cold-path: 8-12s. Crossed the 10s ceiling consistently on the first request after a function-pool idle period.

2. **`GET /dashboard/dsa/cases/[id]/results`** (lender results page) — SvelteKit's combined `__data.json` endpoint loaded the full layout chain (root + dashboard + dashboard/dsa + case-detail) **plus** the results page's own `+page.server.ts` which did 3-4 sequential MongoDB queries + CSFLE decrypt. Total cold-path also exceeded 10s.

The parallel session's S219 mitigations (per-request DB query parallelization, OTel lazy-load, keep-warm `/api/health` cron) reduced the 504 rate but didn't eliminate it. The user explicitly stated "Pro is not the option" — Vercel's $20/mo Pro plan (60s function ceiling) was off the table.

**Iteration history during S220** (informative, not normative):
- Option C: retry button improvement → user-visible but not structural
- Option B: revert d329b08e UX inversion → wrong call (re-introduced modal-stacking the owner had asked to remove)
- Silent auto-retry on 504 → harm-reduction, not root-cause
- Per-phase timing instrumentation → diagnostic, not corrective
- Eventually: structural restructure on BOTH surfaces

## Decision

Adopt two complementary patterns for keeping server work under Vercel Hobby's 10s ceiling:

### Pattern A — Two-phase submit split

When a single endpoint does heavy multi-step work that approaches or exceeds the function timeout, split the work into two endpoints, each independently fitting under the ceiling:

- **Phase 1** owns the cheap, must-happen-first work (validation, auth, gates, persistence of the request itself). Returns a `caseId` / resource ID in ~1-3s.
- **Phase 2** is a SEPARATE endpoint that owns the expensive work (rule engine, computation, downstream persistence). Takes the resource ID as a URL parameter. Idempotent on the source resource's version so repeated calls return cached results.

Security invariants (mandatory for the canonical pattern):
1. Phase 2 takes the resource ID from URL ONLY — never a request body payload. Prevents the rule engine from being exposed via fuzzing.
2. Phase 2 calls `verifyCaseOwnership` (or analogous BOLA defense) before any work.
3. Phase 2 is idempotent on `(resource_id, source_version)`. Engine runs ONCE per source version; repeated calls return the cached snapshot. Defeats timing-oracle and fuzzing attacks on repeat calls.
4. Any state needed by phase 2 (e.g., relationships in our case) is persisted by phase 1 into the resource itself, never re-sent over the wire to phase 2.

Reference implementation: `/api/evaluate-and-persist` (phase 1) + `/api/cases/[case_id]/evaluate-offers` (phase 2). Shared helpers: `src/lib/server/evaluateAndPersistShared.ts`. Lock test: `src/lib/testing/__tests__/billing/upgradePromptWiring.test.ts` (13 assertions ratifying the architecture + the four invariants).

### Pattern B — CSR-with-API-fetch for heavy data pages

When a SvelteKit page's `+page.server.ts` load function does heavy data work that pushes its `__data.json` fetch over the function timeout, restructure the page to client-side rendering:

- `+page.server.ts` shrunk to a thin pass-through (e.g., `return { caseId, requestedVersion: url.searchParams.get('version') }`). Zero DB queries, sub-100ms even cold.
- New API endpoint (e.g., `/api/cases/[case_id]/results-data`) owns the heavy work. Has its own 10s budget. If THIS endpoint times out, the page is already rendered and shows a recoverable error UI with a retry button — never the Vercel 504 splash.
- `+page.svelte` uses `$state` populated by `onMount` fetch. Shows skeleton/loading UI during the fetch. Same `data` prop interface as before is achievable by populating `data.X` references via local `resultsData = $state(...)`.

Security invariants (same as Pattern A's phase 2):
1. The data API takes IDs from URL only.
2. Calls ownership / BOLA defense before any data return.
3. Returns ONLY data for resources the user owns.
4. CSFLE-aware (uses `resolveSnapshotPayload` when reading encrypted snapshots).

Reference implementation: `/api/cases/[case_id]/results-data` endpoint + `/dashboard/dsa/cases/[case_id]/results/+page.server.ts` (thin) + `+page.svelte` (CSR with skeleton).

### Combined effect

These two patterns are siblings. Pattern A targets `POST` flows; Pattern B targets `GET`-rendered pages. Both achieve the same goal: making the user-visible Vercel 504 splash structurally impossible on the affected surface, while keeping all security/ownership/idempotency guarantees the original SSR/single-endpoint design provided.

## Consequences

### Positive
- **User cannot reach a Vercel 504 page on the patterned routes.** Worst case is a graceful error with retry built into our UI.
- **Each phase / API call has its own 10s budget.** Cumulative work that previously couldn't fit now fits in two pieces.
- **Phase 2 / data API is naturally idempotent**, eliminating duplicate-resource risk from silent auto-retries.
- **Pattern is documented and reusable.** Future similar surgery (e.g., case-detail layout if it ever 504s) follows the same recipe with the same security invariants.
- **No infrastructure change required.** Stays on Vercel Hobby. No Render migration, no Pro upgrade.

### Negative
- **Pattern A adds one HTTP round-trip** to the submit flow (phase 1 → phase 2). Browser-to-Vercel latency is added to the total user-perceived time. Empirically: 50-200ms overhead per submit. Acceptable.
- **Pattern B converts SSR to CSR** on the affected page. Search engines can't index page content (acceptable for authenticated dashboard surfaces, not for public pages). First-paint shows skeleton instead of real data — the engaging skeleton UI from `3fe23b29` mitigates this perceptually.
- **More endpoints to maintain.** Each split creates a new API surface that needs auth, rate limiting, security tests, OTel instrumentation. Phase 2 of the submit split and the data API of the results page both gained per-endpoint timing logs and rate limits.
- **Idempotency invariant adds complexity** to phase 2 / data APIs. Engine must check the source version and short-circuit on match. Lock test ratifies this.

### Neutral / accepted trade-offs
- Cold-start cost itself is unchanged — only redistributed across two function invocations. The combined cumulative work isn't smaller; it just no longer happens within a single 10s window.
- Phase 2 still pays cold-start cost on first invocation per function instance. Empirically negligible because phase 1 just warmed the function pool for phase 2 to land warm.

## Alternatives Considered

### Vercel Pro upgrade ($20/mo, 60s function ceiling)
Rejected by owner. Single-line fix that would have made all the structural restructuring unnecessary, but the user explicitly stated "Pro is not the option" during S220.

### Render adapter-node migration (ADR-0027)
Already on the table as the architectural escape hatch — would eliminate function timeouts entirely by running on a long-lived Node process. Currently deferred with explicit trigger ("next user-reported 504 today's mitigations can't absorb"). The two-phase + CSR pattern from this ADR substantially reduces the likelihood that trigger fires.

### Per-lender Worker thread parallelism in `evaluatePayload`
Considered for cold-start reduction. JSON-Logic + EMI/FOIR math is CPU-bound; Node's single-threaded event loop limits async parallelism. Workers could theoretically shave 2-4s from the rule-engine loop. Rejected for v1: multi-day implementation work; Pattern A's two-phase split already gets the engine work under 10s in its own budget without parallelism.

### Streaming `load` (SvelteKit primitive)
Considered for the results page. SvelteKit lets `+page.server.ts` return promises that resolve later, with `{#await}` blocks in the template. Rejected for the results page specifically because the function itself still runs until the streamed promises resolve — the 10s function ceiling still applies. Streaming changes perception, not the underlying timeout. May still be appropriate for OTHER slow-data pages where the total work fits in 10s but renders sequentially.

### Background-worker / queue + polling
Considered (third-AI optimization audit Step 4 recommendation). Save submit → return 202 → poll for status. Rejected for the submit flow specifically: introduces eventual consistency where a synchronous response is expected; needs persistent job state; adds significant UX complexity. Pattern A achieves the same goal (work fits under timeout) without changing the synchronous-feeling user flow.

## Sunset trigger

This ADR sunsets when one of the following holds:
- The codebase migrates to a platform without function timeouts (Render adapter-node per ADR-0027, or comparable). At that point both patterns become unnecessary additional complexity and the affected endpoints can be re-merged. New ADR required to formalize the rollback.
- Vercel raises the Hobby function ceiling to >60s OR DigitalDSA upgrades to a higher Vercel tier with adequate headroom. Pattern A specifically becomes optional at that point; Pattern B may still have UX value on its own merits.

No date-based sunset — this is a structural architecture choice tied to the current platform constraints, not a workaround with a known expiration.

## References

- Spec / ADR-0027: Defer Render adapter-node migration with explicit trigger
- CHANGELOG entry S220 (2026-06-03): full per-commit narrative including the iteration history that landed on these patterns
- Reference impl (Pattern A): `src/routes/api/evaluate-and-persist/+server.ts` + `src/routes/api/cases/[case_id]/evaluate-offers/+server.ts` + `src/lib/server/evaluateAndPersistShared.ts`
- Reference impl (Pattern B): `src/routes/api/cases/[case_id]/results-data/+server.ts` + `src/routes/dashboard/dsa/cases/[case_id]/results/+page.{server.ts,svelte}`
- Lock test: `src/lib/testing/__tests__/billing/upgradePromptWiring.test.ts` (Layer 3c — 2-phase + CSR security invariants)
- Skeleton UI precedent for Pattern B's loading state: `src/routes/dashboard/dsa/cases/[case_id]/results/+page.svelte` (S220 commit `3fe23b29`)
