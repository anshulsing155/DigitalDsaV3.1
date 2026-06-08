# ADR-0010 — DATA-4 `person_id` deferred (null) in analytics warehouse v1

**Status**: Accepted
**Date**: 2026-05-20
**Session**: 2026-05-20 (DATA-4 build)

## Context

The DATA-4 analytics warehouse spec designed `person_id` as a one-way privacy
bridge: `HMAC-SHA256(ANALYTICS_PEPPER, pan_hash)`, letting the de-identified
store count *unique borrowers* across cases without ever being reversible to a
PAN. The spec assumed every operational record carries a pepper-salted
`pan_hash`.

Investigation during the build found two problems with that premise:

1. **PAN is intentionally absent from the form payload** (a deliberate
   privacy exclusion). A PAN hash exists only in `case.lock.applicants_at_lock[]`
   and only for **doc-upload (locked)** cases — never for manual-entry cases.
   So `person_id` could be computed for only a fraction of cases.
2. **A loan has multiple applicants.** Tagging one `person_id` per case off the
   *primary* applicant's PAN misrepresents "unique people" on multi-applicant
   loans, so even where computable it would be misleading.

A third realization removed the urgency to solve it now: `LenderResultsSnapshot`
and `FormSnapshots` are **immutable and never deleted** (AD-05). The operational
data needed to derive `person_id` later is preserved indefinitely, so a future
backfill loses nothing. v1 also ships with **no dashboards** — nothing consumes
unique-person counts yet.

## Decision

Ship DATA-4 v1 with `person_id` always **null**. Keep the field (typed
`string | null`) and the `personIdFromPanHash` helper as ready, tested plumbing.
Do not compute `person_id` from a single per-case PAN, and do not introduce a
weak attribute-combination key (age+gender+profile) — that would create
confidently-wrong collisions rather than honest gaps.

## Consequences

- **Enables:** DATA-4 ships now, accumulating all *other* de-identified case
  data (bucketed amounts, geography, income brackets, lender selection) on a
  PII-free surface, without blocking on an identity-resolution design.
- **Prevents (in v1):** unique-borrower counts and cross-case person linkage.
- **Reversible:** because the source snapshots are immutable, a future slice can
  backfill `person_id` from a proper per-applicant identity bridge with no data
  loss — sequenced for when the first analytics dashboard that needs it is built.
- **Honest degradation:** the warehouse never asserts a person identity it
  cannot stand behind.

## Alternatives Considered

- **`person_id` for locked cases only** — would cover doc-upload cases but leave
  manual cases blank, undercounting and failing to link a borrower's cases that
  span both modes. Rejected: partial + misleading.
- **Mobile-hash instead of PAN** — broader coverage, but mobile is a weaker
  identity anchor (shared/changed numbers) and may also be excluded from the
  payload. Rejected for v1.
- **Attribute-combination key (age+gender+profile)** — not unique; would merge
  distinct people. Rejected: worse than not counting.

## References

- `docs/specs/DATA-4-ANALYTICS-WAREHOUSE-V1-SPEC.md` §3 (one-way bridge) + §5
  (reconciled field table) + §11 (slice status)
- `src/lib/server/analytics/personIdHmac.ts`, `buildAnalyticsCase.ts`
- `docs/CHANGELOG.md` 2026-05-20 (DATA-4 entry)
- AD-05 (immutable, never-deleted snapshots) — `CLAUDE.md` §13
