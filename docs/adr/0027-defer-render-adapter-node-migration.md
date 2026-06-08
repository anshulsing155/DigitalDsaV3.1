---
type: adr
epic: PERF
status: accepted
last_verified: 2026-06-03
related_specs: []
related_adrs: []
test_coverage: []
owner: tech@digitaldsa.com
---

# ADR-0027 — Defer Render adapter-node migration with explicit trigger condition

**Status**: Accepted
**Date**: 2026-06-03
**Session**: S219 (production-down hotfix batch)

## Context

On 2026-06-03 a testing user reported production failures on `www.rinn.in`:

- `POST /api/evaluate-and-persist` → 504 FUNCTION_INVOCATION_TIMEOUT (10s execution before Vercel killed it)
- `GET /api/cases/[id]/snapshots` → 500 (Pitfall #68 fallout, stale ciphertext)
- `/dashboard/dsa/cases/[id]` → 504 on cold start

The 500 was fixed by per-row decrypt resilience + plaintext fallback (`eac11c29` + `dc5b614e`). The 504s are a deeper category — Vercel Hobby plan caps every function execution at 10 seconds, and cold start (~3-5s for Node 22 module load + MongoDB Atlas TLS handshake) eats most of that budget before the actual work begins. Every push to `main` triggers a Vercel redeploy → function resets to cold → next request hits the cap.

Latency optimizations shipped this session (~250-600ms cut across three endpoints via dedup + Promise.all parallelization) help, but they don't structurally solve the cap. They just make the existing approach a little less fragile.

The owner asked: "isn't there a fundamental fix? What if customers get frustrated as we grow?" — leading to an architectural review of escape options.

## Decision

**Defer the Render adapter-node migration until next significant Vercel 504/cold-start recurrence.**

The migration plan is fully worked out and preserved in `docs/DEVELOPMENT-PLAN.md` long-tail backlog so it can be picked up cold by a future session without re-doing the analysis. The trigger condition is explicit and observable: another user-reported 504 / FUNCTION_INVOCATION_TIMEOUT on production that today's keep-warm cron + per-endpoint latency cuts can't absorb.

Rationale for deferral:

- App is currently in **testing**, not active customer-facing production. Today's 504s came from internal testing, not paying customers.
- The shipped hotfixes (snapshots resilience, layout parallelization, evaluate-and-persist dedupe, keep-warm endpoint + cron infrastructure, structured timing logs) cover the immediate failure modes and add observability for the next incident.
- The migration costs ~half a day of focused work + DNS cutover + a week of carrying both deployments. Not free in attention.
- Owner is willing to absorb future 504s in exchange for not paying the migration cost until necessary. Explicit signal: "let the vercel fail again as everything is running in testing as of now."

When the trigger fires, the pre-decided escape is **Render** (not Inngest, not BullMQ+Railway, not Vercel Pro) — see Alternatives.

## Consequences

**Enables:**
- Continue shipping product features without taking on a platform migration today
- Keep cost at $0/mo (Vercel Hobby) while testing economics work themselves out
- If the trigger never fires, no migration cost ever incurred
- Full migration plan is preserved as cold context — next session can execute without re-architecting
- New ADR-0027 with trigger condition means the deferral is durable across session boundaries (a `/start` reading this doc gets the same context as today)

**Prevents:**
- "Decision rot" — without an ADR, a future session might re-litigate the same options from scratch and pick differently
- Vague "we'll think about it later" — the trigger condition is observable, not aspirational
- Half-done migrations — by treating it as a one-shot event when triggered, we avoid the "let's start migrating preemptively and pause when we get busy" pattern that creates broken partial states

**Tradeoffs accepted:**
- Future 504s WILL happen on cold-start scenarios that today's hotfixes can't absorb (heavier-than-typical cases, network blips during MongoDB connect, multiple deploys in a short window). These count as the trigger condition firing.
- Internal users (DSA testers) may hit a 60s cold start during off-hours. Acceptable for testing phase; would not be acceptable for paying customers.
- If we cross 500 active customers without ever hitting the trigger (unlikely), we'd still want to migrate proactively — but that's a happy problem.

## Alternatives Considered

Four real escape options were evaluated end-to-end (full discussion in S219 transcript):

### A. Vercel Pro upgrade ($20/mo, instant fix)
- **Pro:** 60s function timeout (6× current cap), no code change, no migration
- **Con:** $20/mo recurring vs $0 today. Owner explicit: "no [Pro upgrade], not now until we have 500 real customers."
- **Rejected because:** owner has cost preference; $20/mo is meaningful while in testing

### B. Inngest (managed job queue, free tier 1K runs/mo)
- **Pro:** Cleanest developer experience, retries + observability + step composition out of the box, SvelteKit-friendly
- **Hidden con:** On Vercel Hobby, Inngest function STEPS still run inside YOUR Vercel function → same 10s cap per step. Multi-step jobs work around it but don't escape it.
- **Bigger con:** Adds vendor dependency for a queue we don't really need — our heavy work is "run rule engine + persist" which is one step, not a fan-out workflow
- **Rejected because:** queue infrastructure is overkill when the actual need is "longer execution budget," and Inngest doesn't structurally solve that on Hobby

### C. BullMQ + Upstash Redis + Railway worker (escapes 10s cap)
- **Pro:** Worker runs as a long-lived Node process on Railway, no per-request time limit. Open-source protocol (no vendor lock-in).
- **Con:** Two deployment surfaces (Vercel + Railway), two dashboards, more ops complexity for debugging
- **Con:** Requires UX change (evaluating page polls status instead of waiting for sync response). Doable, but ~2-3 days of work.
- **Rejected because:** the complexity is not justified when option D achieves the same outcome (escape 10s cap) with ~half a day of work and ZERO architectural change

### D. Move SvelteKit to Render with adapter-node (THE PRE-DECIDED ESCAPE)
- **Pro:** Eliminates 10s cap entirely (app runs as long-lived Node.js process, no serverless cap)
- **Pro:** Zero code change beyond `svelte.config.js` (swap `adapter-vercel` → `adapter-node`)
- **Pro:** Render Starter $7/mo gives flat-rate predictability; Render free tier viable with 24/7 keep-warm cron at 10-min intervals (fits 750-hr/mo cap with 6-hr margin in 31-day months)
- **Con:** Loses Vercel-specific features (edge network, preview deployments — both have Render equivalents)
- **Con:** Migration takes ~half day + DNS cutover + ~1 week of carrying Vercel as fallback
- **Selected as the escape route** when trigger fires

The decision is therefore **D, deferred** — not "don't decide," but "decide which path to take when triggered, and lock it in now so the next session doesn't re-litigate."

## Trigger condition (observable, durable)

The Render migration should be picked up when **any** of the following is reported:

1. **User-facing 504 on `/api/evaluate-and-persist`** that recurs after `HEALTH_PING_SECRET` is configured and cron-job.org is verified to be pinging `/api/health` successfully — meaning the keep-warm cron is operationally active and the 504 happened anyway
2. **Phase timing logs** (`event: 'evaluate_and_persist.timing'`) show `total_ms` consistently above 8000 across the last 50 requests — indicates we're operating right at the cap, not just unlucky on one request
3. **Customer-facing scenario** changes — currently in testing phase, but at 50+ active production DSAs the cold-start risk becomes a customer-experience problem rather than a tester nuisance

Any one of these is sufficient to fire the trigger. The default Highway pick the session after that should be the migration (per DEVELOPMENT-PLAN backlog).

## References

- DEVELOPMENT-PLAN.md backlog: "Render adapter-node migration (DEFERRED — trigger: next significant Vercel 504/cold-start issue)"
- S219 hotfix commits: `7a2e85c2` `eac11c29` `dc5b614e` `1d847fef` `74c5efef`
- Pitfall #68 — `CSFLE_ENABLED='true'` IS the switch, no intermediate state (related context for stale ciphertext fallout)
- Pitfall #72 — `Promise.all` in batch API routes (introduced this session as part of the snapshots fix)
- `docs/runbooks/KEEP-WARM-CRON.md` — operator setup for the keep-warm pattern
- `scripts/backfill-strip-stale-ciphertext.mjs` — one-off backfill to clean up Pitfall #68 fallout
- CHANGELOG.md S219 entry
