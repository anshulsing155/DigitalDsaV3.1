# Architecture Decision Records

This directory holds ADRs — short, append-only records of significant architectural decisions made on this codebase. Each ADR captures: what was decided, why, what alternatives were considered, and what consequences (good and bad) we're accepting.

## Why ADRs

The codebase is several years old and growing. Decisions that seemed obvious at the time get forgotten, then re-litigated by future contributors who don't have the original context. ADRs solve that — they preserve the rationale alongside the code.

## Format

```
# ADR-NNNN — <Short Title>

**Status**: Accepted | Superseded by ADR-MMMM | Deprecated
**Date**: YYYY-MM-DD
**Session**: S<N> (if applicable)

## Context
What's the problem? What's the situation that forced this decision?

## Decision
What was decided, stated actively. ("We will…", "We won't…")

## Consequences
What does this enable? What does it prevent? What trade-offs are we accepting?

## Alternatives Considered
What other paths were on the table? Why weren't they chosen?

## References
Links to related code, roadmap items, prior ADRs.
```

## Rules

1. **Numbered sequentially** — `0001-*.md`, `0002-*.md`, etc. Never reuse a number.
2. **Immutable once accepted** — to revise a decision, write a NEW ADR that supersedes the old one; update the old one's Status to `Superseded by ADR-MMMM`.
3. **High bar for inclusion** — ADRs are for decisions with long-term consequences. "We used a Map instead of a Set" is not an ADR. "We chose REST over GraphQL" is. "We use Capacitor for mobile" is. "We're not doing a V4 rewrite" is.
4. **Written by `/end`** — the session-lifecycle protocol prompts for ADR creation when it detects a decision worth recording. Manual additions are fine too.

## Index

| ADR | Status | Title |
|-----|--------|-------|
| [0001](0001-no-v4-repo.md) | Accepted | Incremental migration on V3, no V4 rewrite repo |
| [0002](0002-api-first-architecture.md) | Accepted | API-first JSON endpoints rather than SvelteKit form actions |
| [0003](0003-session-lifecycle-system.md) | Accepted | `/start` + `/end` session-lifecycle system |
| [0004](0004-email-error-pipeline-over-sentry.md) | Accepted | Email-based client error reporting over Sentry SDK |
| [0005](0005-mongodb-field-level-encryption.md) | Proposed | MongoDB field-level encryption strategy for PII (SEC-2 design pass) |
| [0006](0006-data-segregation-and-sequencing.md) | Accepted | Data initiatives sequencing — DATA-3 → SEC-2 → DATA-2 → DATA-1 |
| [0007](0007-loan-switch-silent-no-modal.md) | Accepted | Loan-switch is silent — no confirmation modal, preserve via parked loans |
| [0008](0008-cross-field-validation-on-next-only.md) | Accepted | Cross-field validation fires on Next-click only, not per-keystroke |
| [0009](0009-csfle-explicit-over-queryable-encryption.md) | Accepted | CSFLE Explicit Encryption Over Queryable Encryption |
| [0010](0010-data4-person-id-deferred-in-v1.md) | Accepted | DATA-4 `person_id` deferred (null) in analytics warehouse v1 |
| [0011](0011-name-free-case-label.md) | Accepted | Name-free case label; customer name only in DSA-authenticated views |
| [0012](0012-business-loan-applicant-model.md) | Accepted | Business Loan applicant model (company = multi; directors are non-financial co-applicants) |
| [0014](0014-billing-rail-provider-agnostic.md) | Proposed | Recurring billing rail: provider-agnostic architecture (Path 2), leaf provider TBD |
| [0015](0015-text-prefix-utility-class-convention.md) | Accepted | Custom utility CSS classes adopt `text-*` prefix + camelCase font helpers |
