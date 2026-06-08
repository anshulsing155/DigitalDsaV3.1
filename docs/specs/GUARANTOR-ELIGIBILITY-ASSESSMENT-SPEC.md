# Guarantor Eligibility Assessment — v1 Spec

> **Status**: APPROVED 2026-05-28 — ready to implement after D.1 S8 closes.
> **Tier**: 3b (rule engine; slots between D.1 and Epic E).
> **Estimated effort**: ~1 to 1.5 days for v1.
> **Owner decisions locked 2026-05-28** — see "Decisions locked" block at the bottom.
> **Logged**: 2026-05-28 (owner: "we have missed this part in entire development").

---

## The gap

The rule engine handles guarantor INCOME correctly today:

- Guarantor income is **assessed independently** per lender's haircut rules.
- That assessed amount is **NOT pooled** into the borrower's eligibility (`final_amount = 0`).
- The guarantor's CIBIL is checked against each lender's `cibilScope`.

What is **missing** is the second step lenders actually run on a guarantor:

> Can this guarantor — independently — service the EMI if the primary borrower defaults?

Each lender has its own policy threshold (e.g. 70%, 80%, 100% of EMI). Without this assessment, the results page tells the DSA "Guarantor income verified" but doesn't say "Will this guarantor actually be ACCEPTED by Lender X as a guarantor?". A guarantor who fails the policy threshold is effectively no guarantor — the lender will reject the case or demand a substitute.

---

## Domain rules (LOCKED)

- **A loan can have AT MOST ONE guarantor.** On secured loans the guarantor is **derived** from `onEMI === false AND onProperty === false` (see applicantRoleUtils line ~448), so the rule is enforced at the form level by counting that combination across applicants. At most one such applicant per case. The cross-field validator emits a blocking error if a second appears. Adopted 2026-05-28. **Form validation landed 2026-05-28.**
- **No auto-suggest "consider adding a guarantor".** The engine assesses ONLY the guarantor the DSA explicitly added. No proactive recommendations on AMBER-borrower-only cases. Adopted 2026-05-28.
- **No backfill of legacy snapshots.** No production cases exist yet, so the feature ships forward-only — every case after the deploy gets the assessment, prior cases stay un-assessed. Adopted 2026-05-28.

---

## What v1 must deliver

### 1. Per-lender policy field

One new field on each lender's policy. Just one:

```ts
guarantor_acceptance: {
  // Minimum % of the proposed EMI the guarantor must independently service
  // (after their own existing obligations). Default 80 (HFC norm) until
  // RM-side per-lender data is gathered. null = lender does not accept
  // guarantors at all.
  min_emi_capacity_percent: number | null;
}
```

This lives alongside `cibilScope`, `max_foir`, etc. in the policy encoding. PMS Phase 4 (encode wizard) and Phase 6 (admin review) inherit through their existing diff-based flows; the wizard needs one new field — that's it.

### 2. Engine assessment

For each lender × the single guarantor in the case (if any):

```
proposed_emi          = EMI the lender would offer (already computed in engine)
guarantor_capacity    = (guarantor_assessed_income × lender.max_foir)
                          − guarantor_existing_obligations
guarantor_capacity_%  = guarantor_capacity / proposed_emi × 100

guarantor.accepted_by_lender = (guarantor_capacity_% >= lender.min_emi_capacity_percent)
```

The proposed_emi is the SAME EMI the borrower is offered at that lender — so guarantor capacity is judged against the EMI the lender actually proposes, not the EMI the DSA requested.

### 3. Age-at-maturity check (correctness, not polish)

If `guarantor.age + tenure_years > lender.max_age_at_maturity`, the guarantee is legally invalid at maturity — the guarantor would be too old by the time the loan matures. Mark `accepted_by_lender = false` regardless of capacity. Same rule the engine already runs on borrowers; mirror it for the guarantor.

### 4. Result-tile surfacing

The lender result card gets a single new row:

| Field | Display |
|-------|---------|
| Guarantor (Name) | ✅ Accepted (110% capacity) OR ❌ Rejected (40% capacity vs 80% required) |

Two states only — no Marginal, no expand/collapse, no per-lender table (the 1-guarantor rule makes a table unnecessary). Hide the row entirely if no guarantor on the case.

**Traffic-light impact:**
- Borrower fails on income → already handled, no change.
- Borrower passes AND guarantor is required AND guarantor rejected → AMBER with note "Guarantor verification needed".
- Borrower passes AND guarantor accepted (or none on case) → GREEN unchanged.

"Guarantor required" surfaces through the existing rule-engine deviation-recovery framework — not a new concept.

### 5. Form validation (LANDED 2026-05-28)

**Mechanism (clarified by owner 2026-05-28)**: on secured loans the "Guarantor" role is **derived**, not picked. An applicant whose `onEMI === false AND onProperty === false` IS a guarantor (see `applicantRoleUtils.deriveIndividualClassification` line ~448 — returns `'guarantor_financial'` for that combination). So enforcing "1 guarantor per loan" really means **at most one applicant in the case can have both flags set to No**.

Implementation (shipped in `crossStepValidator.ts` cross-applicant block):

- For SECURED loans only (HL / LAP / Plot), scan all applicants and count those with `onEMI === false AND onProperty === false`. Company applicants are skipped (they're not guarantors).
- If the count is ≥2, emit a blocking `error` contradiction for each duplicate beyond the first, indexed to the offending applicant so the UI can highlight it.
- Error message guides the DSA: set "On EMI" or "On Property" to Yes for the duplicate, OR remove the existing guarantor first.
- First-found-guarantor is left alone — it's the legitimate single guarantor.
- Locked by `singleGuarantorRule.test.ts` static + behavioral scan.

**Unsecured loans** use a different role-picker mechanism (explicit role selection on the obligation, not derived from onEMI/onProperty). Their equivalent validation is deferred until the engine assessment ships — at that point the spec for the unsecured guarantor identification rule will be reviewed alongside.

---

## What's deferred to v1.1 (and why)

These are deliberate omissions, not gaps. Capture each as a one-line carry-over when v1 ships:

- **Property-backed floor carve-out** — "guarantor below threshold accepted if they offer their own property as security" — adds a 3rd state (Marginal), another policy field, and engine branching. Rare in practice. Add in v1.1 if real cases need it.
- **Family vs non-family threshold variation** — most NBFCs accept family guarantors at a lower threshold. Doubles the per-lender data collection and adds a relationship-aware engine branch. Family relationship is captured elsewhere in the form — surface it as informational text on the result, don't gate logic on it in v1.
- **Risk-adjusted ROI based on guarantor capacity gap** — separate feature, belongs to pricing v2.
- **Auto-suggest "swap this guarantor for X"** — UX-heavy, not asked for, deferred.

---

## RM-side data the policy team needs to gather

For each of the 77 lenders we encode policy for, just ONE number:

- Default `min_emi_capacity_percent` (most common: **80%** for HFCs, **100%** for PSU banks, **70%** for fintech-NBFCs)

That's it. v1 ships with 80% as the default and the RM team can update per-lender values via the PMS encode wizard once gathered. No blocker — engine code works against the default from day one.

---

## Implementation outline (effort breakdown)

| Slice | Time | What lands |
|-------|------|------------|
| Engine extension | ~3 hrs | Read `guarantor_acceptance.min_emi_capacity_percent` per lender, compute capacity %, age-at-maturity check, set `guarantor.accepted_by_lender` boolean on the result. |
| Policy schema | ~1 hr | Add the new field to the policy-engine type definitions + PMS encode wizard step. |
| Result UI | ~2 hrs | Single row on lender card with Accepted/Rejected badge. Traffic-light AMBER demotion when guarantor rejected. |
| Form validation | ~1 hr | UI guard preventing a second guarantor from being added. |
| Tests | ~2 hrs | Unit tests for engine path, lock-test for one-guarantor rule, snapshot updates. |
| Pitfall doc + DEVELOPMENT-PLAN update | ~30 min | Self-explanatory. |

**Total: ~9-10 hours, well within 1-1.5 days.**

---

## Decisions locked (2026-05-28)

| # | Question | Decision |
|---|----------|----------|
| 1 | Threshold default before per-lender data is gathered | **80%** (HFC norm) |
| 2 | Auto-suggest "consider a guarantor" on AMBER borrower-only cases | **No** |
| 3 | UI density (full table vs aggregate vs single-row) | **Not needed** — moot under 1-guarantor rule; single row per lender card |
| 4 | Backfill legacy snapshots | **Not needed** — no production cases exist yet |
| 5 | Multiple guarantors per loan | **At most one** — UI rejects a second add attempt |

No further open questions. Spec is ready to implement.
