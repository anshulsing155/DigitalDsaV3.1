---
type: adr
epic: PERF
status: proposed
last_verified: 2026-06-05
related_specs: []
related_adrs: [ADR-0029]
test_coverage: []
owner: tech@digitaldsa.com
---

# ADR-0032 — Per-lender Worker-thread parallelism in `evaluatePayload`

**Status**: Proposed (thinking-doc, not yet decided)
**Date**: 2026-06-05
**Session**: S226 — written as a planning artifact for the next big perf decision; superseded by an Accepted/Rejected version when implementation is actually scheduled.

> **READ THIS FIRST.** This ADR is **not a commitment**. It describes a candidate optimization with rough estimates, real risks, and a 4-step implementation outline so the team can make an informed go/no-go decision later. Treat numbers as ±50% until measured on real data.

---

## Context

After the F1-F6 perf pass (S226), the cold-path submit→results flow looks like:

```
Phase 1 (evaluate-and-persist):   1-3s    ← validation + persistence
Phase 2 (evaluate-offers):        4-6s    ← rule engine dominates
  ├ snapshot load + decrypt:      ~200-500ms
  ├ payload rebuild:              ~50-100ms
  ├ evaluatePayload (rule engine): 3-5s   ← ~80-90% of phase 2
  └ persist results:              ~100-300ms
Animation finale + nav:           ~1.6s   (after F1's overlap)
─────────────────────────────────────────
Total user-perceived cold:        ~5.5-6.5s
```

**The rule engine is the dominant remaining cost.** Everything else is sub-300ms. To break through the 5-second floor, the engine itself has to get faster.

### What the rule engine does today

`src/lib/ruleEngine/evaluationEngine.ts → evaluatePayload(payload)`:

1. **Resolves which lenders are in scope** (~30 lenders for an active loan type).
2. **Per lender, sequentially** runs:
   - Geo-policy resolution (CSS-specificity model — most specific policy wins)
   - Eligibility gates (JSON-Logic evaluation)
   - Income assessment (12 profile types × per-source haircuts)
   - EMI / FOIR / LTV calculation
   - Deviation recovery (red→amber when secondary conditions met)
   - Discomfort analysis (per-policy)
   - Approval-probability score
3. **Aggregates** into a single `LenderResultsData` payload (sorted, ranked, with deltas).

**Per-lender work**: ~80-150ms CPU on cold path. Multiply by ~30 lenders → **2.4-4.5s of pure CPU on the main thread**. JSON-Logic evaluation is pure compute; no IO to overlap. Node's event loop is single-threaded, so all 30 lenders run sequentially.

### Why this is on the table now (it wasn't in ADR-0029)

ADR-0029 explicitly rejected Worker parallelism "for v1" — the 2-phase split already gets phase 2 under the 10s Hobby ceiling with margin, so the complexity wasn't justified. That's still true today.

What changed: F1-F6 captured everything else. The next ~2-3 seconds of perceived speedup live exclusively inside the rule engine. If/when the owner wants to push further, this is where it goes.

---

## Decision (proposed)

Refactor `evaluatePayload` to fan out per-lender evaluation across a Node `worker_threads` pool, then aggregate results on the main thread. Maintain the existing security/correctness contract (immutable inputs, deterministic outputs, server-only execution).

### Concrete shape

```ts
// src/lib/ruleEngine/evaluationEngine.ts (PROPOSED — illustrative only)

import { Worker } from 'node:worker_threads';
import { resolve as resolvePath } from 'node:path';

const WORKER_PATH = resolvePath('./evaluationEngine.worker.js');
const POOL_SIZE = Math.max(2, Math.min(8, /* cpu count - 1 */ 4));

let pool: WorkerPool | null = null;
function getPool(): WorkerPool {
  if (!pool) pool = createWorkerPool(WORKER_PATH, POOL_SIZE);
  return pool;
}

export async function evaluatePayload(
  payload: LoanApplicationPayload
): Promise<LenderResultsData> {
  // Main-thread: still owns lender resolution + final aggregation.
  // (Both are cheap — milliseconds.)
  const lendersInScope = resolveLendersInScope(payload);
  const sharedCtx = buildSharedContext(payload);

  // Fan out per-lender evaluation to the worker pool.
  // sharedCtx is structured-cloned across the message-port boundary
  // (once per lender). For ~5KB of context × 30 lenders = ~150KB of
  // serialization on cold path — well under any practical concern.
  const perLenderResults = await Promise.all(
    lendersInScope.map((lender) =>
      getPool().run({ lender, sharedCtx, payload })
    )
  );

  // Aggregate (sort, rank, compute deltas, etc.) on the main thread —
  // it needs the cross-lender view that the workers don't have.
  return aggregateResults(perLenderResults, payload);
}
```

```ts
// src/lib/ruleEngine/evaluationEngine.worker.ts (NEW FILE — illustrative)

import { parentPort } from 'node:worker_threads';
import { evaluateOneLender } from './evaluateOneLender';

parentPort!.on('message', async (msg: WorkerJob) => {
  try {
    const result = await evaluateOneLender(msg.lender, msg.sharedCtx, msg.payload);
    parentPort!.postMessage({ ok: true, result });
  } catch (err) {
    parentPort!.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : String(err)
    });
  }
});
```

### Worker pool primitive

We need a small pool implementation (~80 LOC). The choice is:

| Option | Pros | Cons |
|---|---|---|
| `piscina` (npm) | Battle-tested, queue-aware, cancel + abort signals built in | Adds a runtime dep; transitive surface needs audit |
| Roll our own | Full control, no deps, small surface | Have to maintain; race-condition bugs are subtle |
| `node:worker_threads` raw + ad-hoc spawn | Simplest, but creates 30 workers per request | Worker boot is ~50-100ms each; defeats the parallelism win |

**Recommendation**: `piscina` (~1.5MB) — proven in serverless contexts; the dep cost is dwarfed by the perf gain. Backup plan: roll our own ~100-line pool if `piscina` doesn't play with Vercel's adapter.

---

## Estimated impact

| Lenders | Sequential (today) | 4-worker pool | 8-worker pool |
|---|---|---|---|
| 30 lenders × 100ms avg | **3000ms** | **~800ms** (3.75× speedup) | **~500ms** (6× speedup) |
| 30 lenders × 150ms (cold, P95) | **4500ms** | **~1200ms** | **~700ms** |

**Numbers assume** pure-CPU work distributes evenly across workers. JSON-Logic evaluation is embarrassingly parallel per-lender (no shared mutable state), so the assumption holds.

### Phase-2 total impact

| Path | Today (post-F1-F6) | With Workers (4-pool) | Saving |
|---|---|---|---|
| Cold phase 2 | 4-6s | **1.5-2.5s** | ~2.5-3.5s |
| Warm phase 2 | 2-3s | **0.5-1.2s** | ~1.5-1.8s |
| Total cold submit→results | 5.5-6.5s | **3-3.5s** | ~2.5-3s |

**This is the single biggest server-side speedup left on the table.**

---

## Implementation plan (4 phases — each independently shippable)

### Phase A — Extract per-lender evaluator (1 day, zero behavior change)

Refactor `evaluatePayload` to call a single function `evaluateOneLender(lender, sharedCtx, payload)` in a sequential loop. NO workers yet. Goal: prove the per-lender boundary is clean and the per-lender pure function exists.

- Identify shared-context fields the workers will receive (payload subset + policy index)
- Verify no main-thread state is mutated inside the loop
- Add a `expect(perLenderTimings).toBeWithinTolerance(...)` micro-benchmark test

**Ship gate**: existing engine tests stay green. Phase-2 wall-clock unchanged.

### Phase B — Worker pool infrastructure (1 day)

Add `piscina` or our own pool. Plumb the worker file. NOT yet called from `evaluatePayload` — wire under a `RULE_ENGINE_WORKERS_ENABLED='true'` env flag with a fallback to the sequential loop.

- Vercel adapter compatibility check (does `Worker` work in serverless? Probably yes, but verify on a preview deploy)
- Pool sizing: `min(cpu_count - 1, 8)` capped at the function's available cores
- Graceful shutdown on function recycle

**Ship gate**: env flag off in prod; preview deploy confirms workers boot.

### Phase C — Wire in + soak (1-2 days)

Flip the flag on preview, run real submit flows, compare timings. Lock test asserts the worker path is taken when the flag is on. Idempotency tests confirm same input → same output across sequential + worker paths (regression-locked).

- Telemetry: per-worker timing, pool-saturation counter, fallback-to-sequential counter
- Output equality test: same payload through both paths must produce byte-identical `LenderResultsData`

**Ship gate**: 100+ preview submits with no output divergence vs sequential.

### Phase D — Flip in production (half day)

Enable the env flag in production. Monitor for 1 week. If output divergence or timeout regressions, the flag flips back instantly.

**Ship gate**: 1-week soak in production without flag-flip incident.

**Total**: 3-5 working days, four reversible commits, env-flag-gated rollout.

---

## Risks + mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Output divergence (workers compute differently than sequential) | Low — JSON-Logic is pure | Critical | Phase C output-equality test must be green for 100+ real payloads before C ships |
| Worker boot cost on cold start | Medium | Adds 50-300ms to first eval per pod | Acceptable — cold path was 4-6s, even +300ms still nets a huge win. Mitigate further with keep-warm cron poking phase 2 (already in place for /api/health) |
| Vercel adapter incompatibility | Low | Blocks deployment | Phase B preview deploy proves out compatibility. Fallback is to ship the env flag off and run benchmarks locally |
| Memory pressure (4-8 workers each holding policy index) | Low | OOM in extreme cases | Policy index is ~2-5MB; 8 copies = 40MB max; well within function memory limits (Vercel Hobby is 1GB). Worker shared memory (`SharedArrayBuffer`) is the lever if it becomes a problem |
| Debugging is harder across workers | High (subjective) | DX, not user-facing | Per-worker structured logs tagged with `lender_id`. Reproduction harness can run sequentially via env flag |
| Worker crashes leak the lender's job | Medium | Affected lender shows as "evaluation failed" instead of result | Pool's `.run()` resolves to error → main thread treats as `assessment_status: 'lender_evaluation_failed'` → user sees N-1 lenders. Graceful degradation, not a hard fail |

---

## Alternatives considered

### A1. Optimize the per-lender evaluation itself (memoize, JIT-compile JSON-Logic)
- Pre-compile JSON-Logic expressions once on engine boot; cache per-lender compiled trees
- Memoize cross-lender shared evaluations (e.g. income profile assessment)

**Status**: complementary, not alternative. Could land independently. Estimated win: ~30-40% per-lender speedup if done well. Pairs with workers (workers + JIT = compounded). Should be a separate ADR.

### A2. Move to Vercel Pro ($20/mo) for 60s ceiling
**Status**: rejected by owner ("Pro is not the option") — same constraint as ADR-0029.

### A3. Render adapter-node migration (ADR-0027)
**Status**: deferred per ADR-0027 with explicit trigger. If picked up first, this ADR may become unnecessary (long-lived process has no 10s constraint, but worker parallelism still helps wall-clock).

### A4. Pre-compute the rule engine in a cron job
- Run engine offline for all known DSA/case combos; cache results in Mongo
- User's submit fetches the cached result

**Status**: rejected — case payloads are unique to each submission (loan amount, income mix, etc.). Cache hit rate would be near zero. Not viable.

### A5. Move some rule-engine logic client-side
**Status**: explicitly vetoed by owner (competitive moat — keep all business logic server-only).

---

## Decision criteria (for the future "should we do this?" call)

Implement A4 / Worker parallelism when at least TWO of these are true:

1. **Cold-path submit→results exceeds 5s** on the typical (rinn.in production) load, per real OTel traces, AND there's a business pressure to drop it
2. **Lender count grows past 40** (each additional lender adds ~100ms to the sequential loop linearly; 40+ lenders = 4s+ engine alone)
3. **Vercel Hobby cold-path approaches 9s** consistently, threatening the 10s ceiling
4. **Render migration is rejected for >6 months** AND we've maxed other tricks

If only one is true, defer. The complexity cost of Workers is meaningful and you don't pay it until the ROI is clear.

---

## Reversibility

Each phase ships behind a feature flag. To revert:
- Phase A: revert the refactor (sequential loop returns)
- Phase B-D: flip `RULE_ENGINE_WORKERS_ENABLED='false'` on Vercel — instant fallback to sequential. Code stays in place for re-enable later. No data migration. No schema change.

---

## Test coverage (to be added when implementation starts)

- `evaluationEngineSequentialBaseline.test.ts` — locks sequential output for ~20 representative payloads
- `evaluationEngineWorkerOutputEquality.test.ts` — same payloads via workers; assert byte-identical to sequential baseline
- `evaluationEngineWorkerErrorHandling.test.ts` — simulate worker crash → assert graceful degradation
- `evaluationEnginePoolSaturation.test.ts` — queue-depth assertions

---

## Sunset trigger

This ADR sunsets when:
- The codebase migrates to a platform where rule-engine cold path is no longer a user-visible concern (Render adapter-node typically; new ADR codifies the rollback)
- Per-lender evaluation drops below ~30ms via A1 (JIT + memoization), making sequential 30-lender loops finish in <1s — at which point workers add complexity for marginal gain

---

## References

- ADR-0029 (two-phase submit + CSR-data-page pattern) — original rejection of Worker parallelism for v1, still the standing decision until this ADR is Accepted
- `src/lib/ruleEngine/evaluationEngine.ts:evaluatePayload` — the function this ADR rewrites
- `src/routes/api/cases/[case_id]/evaluate-offers/+server.ts` — the caller; would not change
- piscina docs: <https://github.com/piscinajs/piscina> — candidate pool library
- Node `worker_threads` docs: <https://nodejs.org/api/worker_threads.html>
