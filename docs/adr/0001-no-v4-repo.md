# ADR-0001 — Incremental migration on V3, no V4 rewrite repo

**Status**: Accepted
**Date**: 2026-05-14
**Session**: S98

---

## Context

The codebase has accumulated meaningful architectural debt over multiple sprints:

- 159 API routes still use raw SvelteKit `json()` instead of the `apiOk()`/`apiError()` wrappers
- 30+ routes have inline `if (!locals.user)` auth checks instead of using `requireAuth*` guards
- The bundle has a 3.5MB `pincode_IN_all.js` chunk that should be lazy-loaded by state
- The `engineContext.js` chunk is 1.6MB and likely contains server code leaking into the client bundle
- No CI gating on `pnpm check` — type errors have shipped to `main` (commit `c0cf8e18`)
- 4 high-severity axios CVEs were transitive via razorpay (resolved 2026-05-14 via `pnpm.overrides`)
- The Android (Capacitor) build doesn't have certificate pinning
- MongoDB field-level encryption for PII (PAN, Aadhaar) hasn't been adopted
- ~100 client components hand-roll the `onMount + secureFetch + loading + error` pattern instead of using a query library

During the 2026-05-14 design conversation, the user asked whether to spin up a clean `DigitalDSA-V4` repo to plan and execute all of these improvements without disturbing V3 (which has DSAs in beta).

## Decision

**We will NOT create a separate V4 repository.** All architectural improvements will be made incrementally on V3 via:

1. A long-term roadmap doc: [`docs/ARCHITECTURE-EVOLUTION.md`](../ARCHITECTURE-EVOLUTION.md) — captures every architectural item with effort, risk, dependencies, and a protocol pointer
2. Protocol files in `.claude/protocols/` — durable, copy-pasteable instructions for executing each migration type (Zod, BOLA, load-function, etc.)
3. The session-lifecycle system (ADR-0003) — ensures each session resumes context cleanly and updates the roadmap on close
4. Worktrees for heavyweight migrations (TanStack Query rollout, FLE, etc.) so high-risk work doesn't destabilize `main`
5. ADRs in `docs/adr/` — preserve the rationale for each significant choice

## Consequences

**Positive:**
- V3 keeps shipping features to beta DSAs without interruption
- Test suite (10,564+ tests as of 2026-05-13) keeps validating every commit — a V4 would start with zero tests and have to rebuild that confidence floor
- The hard-won institutional knowledge in CLAUDE.md, MEMORY.md, and SESSION-HANDOFF.md keeps applying — no doc rewrite needed
- Architectural improvements ship one piece at a time, each one immediately benefiting beta users
- No risk of the classic "V4 never catches up to V3" outcome (Joel Spolsky, "Things You Should Never Do")
- No double-maintenance cost (bugfixes only need to land once)

**Negative:**
- Some patterns are harder to retrofit than design from scratch (e.g., full migration off the bespoke form layer)
- The incremental approach is slower per-improvement than a greenfield rewrite would feel in the early days
- Drift between "items already migrated" and "items still using old pattern" persists for months — a cognitive load every contributor must handle

**Mitigations:**
- The ARCHITECTURE-EVOLUTION roadmap makes the "still pending" set explicit
- Protocols enforce consistency for new work even while old code waits its turn
- `/start` always surfaces the next pending item, so progress is continuous

## Alternatives Considered

### Alternative A — Greenfield V4 repo

Start fresh with the modern stack (Zod-first, TanStack Query everywhere, superforms on the form layer, etc.). Get to feature parity with V3 over 3-6 months, then migrate beta users.

**Rejected because:**
- The classic rewrite-from-scratch failure mode (documented by Joel Spolsky and many others): the new repo never catches up because the old one keeps adding features.
- The user can't freeze V3 — beta DSAs depend on it for daily work.
- The architecture wins are achievable incrementally on V3 without giving up the running product.
- Several CLAUDE.md pitfalls were learned through painful incidents (Pitfall #1 `!=` semantics, Pitfall #11 snapshot drift, Pitfall #14 numeric minLimit). A V4 would re-learn those without realizing it.

### Alternative B — Long-lived feature branch (`refactor/v4`)

Same migration but on a branch instead of a separate repo. Squash-merge to main at the end.

**Rejected because:**
- Same staleness problem as Alternative A — main keeps moving, the branch gets harder to merge by the week.
- This codebase has hit branch-sprawl pain before (4-branch local sprawl noted in SESSION-HANDOFF.md pre-S96 cleanup).
- The branch wouldn't get its own test coverage — tests still live on main; if they update on main, the branch breaks.

### Alternative C — Status quo (no roadmap, address debt opportunistically)

Continue current pattern: each session tackles whatever's most pressing, debt is acknowledged but not tracked.

**Rejected because:**
- This is what got us to 159 raw-`json()` routes and 30 inline-auth-check routes. The drift compounds without active tracking.
- The 2026-05-13 enterprise review identified gaps the team didn't know existed (CI not blocking, prior review count understated). Without a roadmap, these surface accidentally rather than systematically.

## References

- [`docs/ARCHITECTURE-EVOLUTION.md`](../ARCHITECTURE-EVOLUTION.md) — the roadmap itself
- [`docs/reviews/CODE-REVIEW-2026-05-13-full.md`](../reviews/CODE-REVIEW-2026-05-13-full.md) — the enterprise review that catalogued the debt
- [Joel Spolsky — "Things You Should Never Do, Part I"](https://www.joelonsoftware.com/2000/04/06/things-you-should-never-do-part-i/) — the canonical reference on rewrite-from-scratch failures
- [ADR-0003](0003-session-lifecycle-system.md) — the system that makes incremental migration tractable
