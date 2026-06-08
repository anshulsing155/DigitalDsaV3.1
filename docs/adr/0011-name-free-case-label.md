# ADR-0011 — Name-free case label; customer name only in DSA-authenticated views

**Status**: Accepted
**Date**: 2026-05-21
**Session**: Epic B (B.1 / B.3 / B.5)

## Context

DSA cases were titled by creation date ("Home Loan — 2026-05-06" repeated),
making a list indistinguishable. The obvious fix (B.1) was to title each case by
its primary applicant — but `Case.label` is rendered on **partner-facing
surfaces**: the RM portal ("Cases Received"), share links, and share-with-RM
email subjects/bodies (`/api/cases/[case_id]/share-with-rm`, the shared-links
page). Putting the customer's name in the stored label therefore leaks borrower
PII to bank partners and to anyone holding a share link.

Mid-implementation the owner tightened the requirement: the customer name must
not appear on any external/partner surface at all (not even a short "Rajesh K.")
— but the DSA must still see the customer in their own views to work the case.

## Decision

The stored `Case.label` is a **name-free descriptor**:
`"{Loan Type} — {Project?} — {City} — {Profile} case"`
(e.g. "Home Loan — Ghaziabad — SENP case"). It contains no borrower PII and is
what every partner surface renders.

The **full customer name is shown only in the DSA's own authenticated views** —
the cases triage table (Applicant column), the case-detail header, and the
Needs-Attention list — by **decrypting the form snapshot at load**
(`resolveSnapshotPayload`, bounded to the visible page) and composing via
`dsaCaseTitle(label, fullName)`. The name is never written to a stored field.

## Consequences

- **PII leakage is impossible by construction** — the name isn't in the stored
  value, so no current or future consumer of `Case.label` (RM portal, share
  links, emails, exports) can leak it without a deliberate new code path.
- **Any new DSA-facing view that needs the name must decrypt** the snapshot at
  load (CSFLE-aware); it can't read the name off the case doc. Bounded to the
  visible page to cap decrypt cost (dev CSFLE-off = passthrough).
- The profile bucket (Salaried/SEP/SENP/Company/Pensioner) is derived from the
  primary applicant via `classifyApplicantProfile` (keyword-based, graceful
  null) and the city from `loanData[loanName]` route keys.
- Existing cases keep their old labels until a backfill runs; the backfill is
  deferred because the applicant name lives in the CSFLE-encrypted snapshot and
  needs CSFLE-aware operator tooling. The triage table's columns make existing
  cases distinguishable regardless.
- No locality/area-name field exists in the forms (only project, pincode,
  area-*type*); an "Arya Nagar"-style locality would require a new form question
  (separate slice).

## Alternatives Considered

- **Full name in the stored label** — most identifiable, rejected: leaks full
  borrower PII to RMs and via share links.
- **Short name ("Rajesh K.") in the stored label** — the initial B.1 approach;
  rejected after owner pushback because even a partial name reaches partner
  surfaces.
- **Name in label + strip at each share boundary** — rejected as whack-a-mole:
  every share/RM/email/export path would need its own redaction, and a missed
  one silently leaks. Name-free-at-source is safe by default.

## References

- DEVELOPMENT-PLAN.md → Tier 2 → B.1 / B.5
- CHANGELOG.md 2026-05-21 (B.1 name-free revision; B.5 triage table)
- Commits `fc767d99`, `e65c9bad`, `36617625`, `5babc13a`, `606946c5`
- Related: AD-06 (no PII in v1 PDF) — same "PII only at the authenticated
  boundary" principle; ADR-0009 (CSFLE) for the snapshot encryption this relies on.
