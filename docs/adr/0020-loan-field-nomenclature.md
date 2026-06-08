# ADR-0020 — Loan application field nomenclature: four-field model

**Status**: Accepted
**Date**: 2026-05-29
**Session**: field-nomenclature-audit (2026-05-29)

## Context

The DSA-customer's loan-application form collects four conceptually distinct pieces of information before branching into product-specific questions: **product** (which umbrella loan), **scope** (fresh vs migrating existing), **facility structure** (term-loan vs revolving OD/DOD/CC), and **variant / subproduct** (which kind of plot loan specifically).

Today the form jams these four axes into only three field names, and the mapping differs per loan:

- Home Loan and LAP put scope in `loanType`
- Plot Loan puts scope in `PlotLoanActivity` and variant in `loanType`
- Personal / Business / Professional Loan put facility in `unSecureLoanType` and scope in `loanType`
- LAP additionally uses `LAPType` for facility

Result: the same field name means different things in different loan contexts; identical concepts use different field names across loans; the parser spec, the rule engine, and the external bank-loan-management API all have to special-case Plot Loan.

A teammate writing `"loanType": "Plot Loan Only"` in a bug report was technically right (Plot DOES store its variant there) while every other loan would interpret that as scope. This pattern has caused at least one documented confusion (Pitfall #33) and is on track to cause more as the codebase grows.

Audit findings (2026-05-29):
- `loanType` is overloaded FOUR ways across the codebase (application scope, application variant in Plot, obligation product, FormSession-as-loanName, QA scenario-as-loanName). Only application contexts are in scope.
- Static lender rule docs reference ZERO of the four fields — rewrite blast radius is contained to form configs, payload builder, types, tests, and the bank-loan-management API.
- The bank-loan-management API (owned by DigitalDSA, https://github.com/eYantrik-rinn/bank-loan-management) already branches on all four field names, so a coordinated two-repo rename is required.
- A casing mismatch exists at the API boundary (PascalCase `LoanName`/`LoanType` vs DigitalDSA's camelCase) — to be standardised to camelCase as part of the same rename.
- `PRODUCT_TYPE_MAP` in `src/lib/types/policyEngine.ts` is declared but never used; flagged for deletion during the rename.

## Decision

Adopt a **four-field nomenclature model** for all 6 loan-application forms:

| Axis | Field name | Used by |
|---|---|---|
| Product | `loanName` *(unchanged)* | All 6 |
| Scope | `loanType` *(consistent — Plot stops being the exception)* | All 6 |
| Facility structure | `facilityType` *(renames `LAPType` + `unSecureLoanType`)* | LAP, PL, BL, Prof |
| Variant / Subproduct | `loanVariant` *(new dedicated field)* | Plot today; future HL variants if added |

`PlotLoanActivity`, `LAPType`, `unSecureLoanType` disappear. Plot's current `loanType` values move into `loanVariant`.

Migration is **three-phase** with dual-write/dual-read transition windows and a 30-day legacy shadow on stored cases:
- **Phase A** — backward-compat reads (code tolerates both old and new names)
- **Phase B** — form writes new names + bank-loan-management API accepts both shapes during coordinated lockstep deploy
- **Phase C** — migrate stored MongoDB cases, remove dual-reads, remove legacy fallbacks

Casing standardisation (PascalCase → camelCase at the API boundary) is folded into Phase B.

Obligation entries, FormSession tracking, and QA scenario types continue to use `loanType` for their own (different) concepts — out of scope for this work.

## Consequences

**Enables:**
- Parser spec instructions become one-rule-fits-all instead of per-loan special-cases
- New loan products slot in by declaring which axes they use, no field-name negotiation
- Pitfall #33's field-overload class closes for good
- Future Home Loan variants (Bridge Loan, Self-Construction HL) have a ready place to live without re-overloading existing fields
- bank-loan-management API gets consistent camelCase payload contract

**Prevents:**
- The teammate-misreads-loanType class of bug
- Silent semantic drift between same-named-fields meaning different things in different loans
- Parser spec authors needing to learn per-loan field-mapping tables

**Accepts these trade-offs:**
- A multi-session migration (3-5 working days estimated, plus per-lender PMS verification)
- Coordinated deploy across two repos (DigitalDSA-V3 + bank-loan-management)
- Snapshot fixture regeneration (5 plot fixtures + several LAP + unsecured)
- A 30-day legacy-shadow window in MongoDB before old keys can be fully removed
- `loanType` remains a 4-way overloaded name across unrelated contexts (obligation, FormSession, QA) — we tolerate this because those contexts are domain-distinct and renaming them is its own conversation

## Alternatives Considered

1. **Simple swap: just flip Plot's `loanType` ↔ `PlotLoanActivity`.** Rejected because it only fixes Plot's symptom while leaving `LAPType` and `unSecureLoanType` doing the same job under different names. Same migration weight in plot-land; modest extra weight gives complete consistency.

2. **Translate at the API boundary only:** internal code uses new names; payloadBuilder maps to old names when calling bank-loan-management. Rejected because Scenario A is confirmed (we own the API), so we can rename end-to-end cleanly. Translation layer would be necessary in Scenario B.

3. **Rename to `loanScope` / `loanRequestType` instead of keeping `loanType` for scope.** Rejected because `loanType` already means scope correctly in 5 of 6 loans; renaming it everywhere would touch ~422 files (many in unrelated obligation/FormSession contexts) when keeping the name and fixing just Plot's outlier behavior achieves the goal with smaller blast radius.

4. **Add a `loanSubProduct` instead of `loanVariant`.** Rejected as semantically equivalent but longer — `loanVariant` reads cleaner and is the more conventional term.

5. **Leave Pitfall #33 in place as documentation of the overload.** Rejected because Pitfall entries are for patterns that have caused bugs, not patterns we accept indefinitely. The field-flip closes the pitfall class; the Pitfall entry gets updated to reflect the post-rename state during Phase C.

## References

- Spec: [`docs/specs/LOAN-FIELD-NOMENCLATURE.md`](../specs/LOAN-FIELD-NOMENCLATURE.md) — multi-session driver doc with phase-by-phase migration plan, blast-radius inventory, risk register
- Companion ADR: [ADR-0021](0021-plot-equity-loan-modeling.md) — Plot & Equity Loan modeling (Phase 1 absorbed by this work)
- Companion ADR: [ADR-0024](0024-loan-vocabulary-and-dual-tenure-deferral.md) — DC vs BT distinction, Start Fresh sunset, mapLoanType archive, dual-tenure deferral
- Pitfall: [`docs/PITFALLS.md`](../PITFALLS.md) #33 — current (drifted) wording on field-name overload; to be updated in Phase C
- Memory: `reference_plot_loan_field_naming.md` — historical context preserved outside the repo
- Code: `src/lib/utils/payloadBuilder/loanTransaction.ts:64-90` — current dual-read for Plot BT detection
- Code: `src/lib/config/commonPage.json` — form schema with the overloaded fields
- External repo: https://github.com/eYantrik-rinn/bank-loan-management (DigitalDSA-owned, Scenario A confirmed) — **dormant indefinitely**; entire client-side surface archived in S214 per the footnote below
- Audit screenshot: CS-2026-0230 (Plot Loan Only Ghaziabad case — field shape end-to-end)

---

## Footnote — S214 (2026-06-02): `bank-loan-management` client surface archived

TECH-DEBT-CLEANUP-2026-05-31 §3 D7 closed in S214 (this footnote written at the same time). Owner confirmation 2026-05-31: the external `bank-loan-management.vercel.app` API is dormant indefinitely; the entire client-side surface that targeted it can be archived permanently.

Investigation found the surface was already 100% dead-code by S214:

- **`src/lib/services/homeLoanApi.ts`** — 3 submit functions never called from anywhere in the live tree post-rule-engine; 6 storage helpers called only by 2 offer routes whose localStorage keys had no writer left. Archived to `src/lib/services/_archive/homeLoanApi-S214.ts`.
- **`src/routes/(app)/(offers)/topup-loan-offers/+page.svelte` + `balance-transfer-offers/+page.svelte`** — permanently rendered empty/fallback state because the localStorage keys they read had no writer. `OFFERS.TOPUP` and `OFFERS.BALANCE_TRANSFER` URL constants in `routes.ts` were never navigated to. Both routes renamed to `_archived_*` (SvelteKit `_` privacy prefix makes them unreachable; Pitfall #63 — `_archived_*` folders must still compile, so the `+page.svelte` was replaced with a self-contained stub).
- **Outbound payload-shape shims** at `lap/+page.svelte:928-995` + `plot-loan/+page.svelte:946-1050` — built `formattedPayload` / `payloadNew` objects with PascalCase fields (`LoanName`, `LoanType`, `LAPType`, `PlotLoanActivity`) shaped for the dormant API. The objects were never sent anywhere — only used for client-side existence-check validation. lap shim: removed in full (the surrounding `loanTransaction` $state + `finalApplicants` build + `formattedPayload` construction all collapsed to direct `combinedAnswers.loanName` / `.loanType` reads). plot-loan shim: validation refactored to read `currentAnswers` directly; surrounding scaffolding left in place because `plotEquityPayloadPatchLock.test.ts` ratifies the structure's existence (the lock test itself rests on a state per CLAUDE.md §16 Rule #16 — see TECH-DEBT-CLEANUP-2026-05-31.md §6 for the Plot & Equity payload-patch reform that should land before the rest of plot-loan's scaffolding can come out).

Negative lock test extended: `src/lib/testing/__tests__/legacyPayloadFieldsAbsent.test.ts` now asserts no live importer of `$lib/services/homeLoanApi` exists, in addition to the prior `bank-loan-management` import-path lock.

Live offers pipeline (the thing that REPLACED this archived surface) is fully documented in `docs/OFFERS-ARCHITECTURE.md`. Single-paragraph summary: a DSA's form data flows through `confirmAndSubmit` → `submitFormForEvaluation` → `/evaluating` → `POST /api/evaluate-and-persist` → in-process rule engine evaluation → MongoDB `Cases` + `FormSnapshots` + `LenderResultsSnapshots` → display at `/dashboard/dsa/cases/[case_id]/results`. The dormant API surface was a pre-rule-engine prototype; the live pipeline has been the canonical path for many months.

Restore path for any of the archived files: `git show <pre-S214-sha>:<original-path>`. The S214 commit message (`chore(cleanup): S214 — D7 bank-loan-management archival`) carries the full zero-importer proof and reasoning.
