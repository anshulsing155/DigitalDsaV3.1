# ADR-0016 — Canonical Current-Loan-Details schema for secured Balance Transfer / Top-up

**Status**: ✅ Approved + LAP+Plot migrated (2026-05-26). HL migration deferred to a pre-launch clean-up pass.
**Date**: 2026-05-26
**Session**: 2026-05-25 evening (LAP+Plot migration sign-off + Strategy B-restricted decision)
**Supersedes**: per-loan `existingDetails.ts` / `existingLoan.ts` schemas for LAP and Plot Loan

## Context

The three secured-loan products (Home Loan, LAP, Plot Loan) each ask the customer the same conceptual question on the Balance Transfer / Top-up flow: *"Tell us about your current loan."* But the three schemas had **drifted independently** over time, asking different subsets of fields with different names:

| Field concept | Home Loan key | LAP key | Plot Loan key |
|---|---|---|---|
| Bank name | `selectSingleBank` | `bankName` | `bankName` |
| Disbursement date | `loanDisbursementDate` | *(not asked)* | *(not asked)* |
| Original tenure | *(not asked)* | *(not asked)* | *(not asked)* |
| Outstanding principal | `principalOutstanding` | `principalOutstanding` | `principalOutstanding` |
| Current interest rate | `existingInterestRate` | `existingInterestRate` | `btExistingInterestRate` |
| Interest rate type | `interestRateType` | *(not asked)* | `btInterestRateType` |
| Remaining tenure | `remainingTenure` (months) | `originalRemainingTenure` (months) | `btRemainingTenure` (string enum `<1`/`10`/`11-15`/`>15`) |
| Current EMI | `includedCurrentEMIsAmount` | `includedCurrentEMIsAmount` | `btCurrentEmi` |
| EMIs paid (count) | `btEmisPaid` | *(not asked)* | *(not asked)* |
| EMI bounce history | `emiBounceHistory` | *(replaced by `repaymentTrack` enum)* | *(not asked)* |
| Loan vintage (bucket) | *(not asked)* | `loanVintage` (enum) | *(not asked)* |

The drift caused real, measurable harm:

1. **Latent payload-builder bug.** `payloadBuilder/loanTransaction.ts:374` reads `loanAnswers.selectSingleBank` only — so `payload.currentBank` was silently undefined for LAP and Plot Loan despite both products having a `bankName` field. The bug was invisible because the schema *had* the field; the engine just couldn't reach it.

2. **Latent typo.** Same file line 378 reads `loanAnswers.remainingTenure ?? loanAnswers.orignalRemaningTenure` (note the typo: `orignalRemaningTenure` instead of `originalRemainingTenure`). The intended fallback for LAP never matched, so `payload.remainingTenure` was silently undefined for LAP too.

3. **Plot Loan's BT data was the thinnest.** Plot asked only 5 fields (principal, bank, EMI, tenure enum, rate). No interest rate type, no EMIs paid, no bounce history, no disbursement date. Lender BT-eligibility checks that need any of those fail at the policy stage.

4. **Cross-field plausibility validation had to be reimplemented per loan.** When the cross-EMI check shipped earlier in the same session, Plot's string-enum tenure required a `TENURE_TO_MONTHS_SWITCH` JSON-Logic workaround that didn't apply to LAP or HL.

5. **Three schemas evolving independently** meant any future field addition risked a 3-way fork.

## Decision

Build one canonical question bank — [`src/lib/config/schema/btLoanDetailsQuestions.ts`](../../src/lib/config/schema/btLoanDetailsQuestions.ts) — exporting:

- 11 individual `RawSchemaQuestion` constants
- `getBtLoanDetailsQuestions()` returning the array
- `buildBtLoanDetailsPage(pageId, showWhen)` returning a `RawSchemaPage` ready to consume from any secured loan's `pages.ts`

Each secured loan's `pages.ts` consumes `buildBtLoanDetailsPage()` with its own `pageId` (preserves backward-compatible page-index restore) and its own `showWhen` (the gating field differs: HL+LAP use `loanType`, Plot uses `PlotLoanActivity`).

### The 11 canonical questions

| # | Key (`bindsTo_template`) | Type | Rationale for the name |
|---|---|---|---|
| 1 | `bankName` | bank select | Matches obligations.bankName + LAP/Plot existing usage. HL outlier. |
| 2 | `disbursedAmount` | currency | NEW — user-specified replacement for `sanctionedAmount`. For under-construction property the bank sanctions higher than is actually drawn in tranches; lender BT cares about what's outstanding, not what was sanctioned. |
| 3 | `loanDisbursementDate` | month-year | HL's existing key kept. Used by payload builder to derive `loanVintageMonths`. |
| 4 | `originalTenure` | months | NEW — gives a sanity check on `remainingTenure` and feeds future BT-eligibility rules. |
| 5 | `principalOutstanding` | currency | Same key across all 3 historically. |
| 6 | `existingInterestRate` | percent | LAP+HL kept; renamed from `btExistingInterestRate` for Plot. The `existing` prefix removes ambiguity vs the prospective new lender's rate. |
| 7 | `interestRateType` | radio (fixed / floating) | HL kept; renamed from `btInterestRateType` for Plot; new for LAP. |
| 8 | `remainingTenure` | months | HL kept; renamed from LAP's `originalRemainingTenure` (which was misleadingly named — it stored remaining, not original); renamed from Plot's `btRemainingTenure` (which was a string enum, now numeric for parity with LAP+HL and for cross-EMI validation). |
| 9 | `includedCurrentEMIsAmount` | currency | LAP+HL kept; renamed from Plot's `btCurrentEmi`. Verbose but unambiguous everywhere it's read. |
| 10 | `btEmisPaid` | count | HL's existing key kept. New for LAP+Plot. Critical for BT-eligibility — many lenders auto-reject if EMIs paid < 6 or < 12. |
| 11 | `emiBounceHistory` | radio (clean / minor / major) | HL kept. New for LAP+Plot (LAP previously had `repaymentTrack` with different enum values; the bounce-specific question is more diagnostic). |

### Rename principle applied (the `existingInterestRate` correction)

During this session the owner stopped a "blind rename" of `existingInterestRate` → `interestRate` (the bare name was semantically ambiguous on a BT page where the new lender's offered rate also exists). That correction generalised:

> **Don't rename existing semantically-specific schema keys for cross-context uniformity unless the existing name is wrong, ambiguous, or absent everywhere except the renaming site. Audit blast radius across all payload builders, lender policies, and test fixtures before any rename.**

Applied consistently: the canonical bank kept `existingInterestRate`, `loanDisbursementDate`, `includedCurrentEMIsAmount`, `emiBounceHistory`, `btEmisPaid` — all five names long enough to be unambiguous at every read site. The new fields (`disbursedAmount`, `originalTenure`) are net-new so naming was free.

### Cross-field plausibility validators built in

The EMI question's `validation.condition` block has two cross-field checks that activate when `principalOutstanding` and `remainingTenure` are both set:

- **Lower bound** — `emi ≥ 0.9 × (principal / months)`. Catches mathematically impossible cases (e.g. ₹557 EMI on ₹23L principal / 22 months — the zero-interest floor alone is ~₹1.07L/month).
- **Upper bound** — `emi ≤ 1.6 × (principal / months)`. Catches typos like an extra zero without false-rejecting legitimate high-rate / short-tenure cases.

Both run as Pitfall #50 implementations and replace the per-loan inline validators added earlier in the session. Plot Loan's `TENURE_TO_MONTHS_SWITCH` workaround is retired (Plot now uses numeric `remainingTenure` directly).

## Scope of this migration (Strategy B-restricted)

**LAP and Plot Loan** adopted the canonical bank in this pass:

- [`lapLoan/pages.ts`](../../src/lib/config/lapLoan/pages.ts) — `buildExistingDetailsPage()` now calls `buildBtLoanDetailsPage()`.
- [`lapLoan/questionBank/existingDetails.ts`](../../src/lib/config/lapLoan/questionBank/_archive/existingDetails.ts) — archived; no callers remain.
- [`plotLoan/pages.ts`](../../src/lib/config/plotLoan/pages.ts) — same migration.
- [`plotLoan/questionBank/existingDetails.ts`](../../src/lib/config/plotLoan/questionBank/_archive/existingDetails.ts) — archived.
- [`securedLoanKeys.ts`](../../src/lib/config/securedLoanKeys.ts) — `LAP_ONLY_KEYS` lost `loanVintage`, `repaymentTrack`, `originalRemainingTenure`; `PLOT_ONLY_KEYS` lost `btCurrentEmi`, `btExistingInterestRate`, `btInterestRateType`, `btRemainingTenure`. All now shared via the canonical bank.
- Test journeys + pre-migration snapshot fixtures regenerated for LAP-BT-TERM, LAP-TOPUP-TERM, LAP-BT-TOPUP, PLOT-BT.

**Home Loan was intentionally NOT migrated** in this pass. Reasons:

- HL's existing 11-question schema is already the most-fleshed-out of the three (gold standard the canonical bank borrowed from).
- HL's question IDs (`q9_selectSingleBank`, etc.) are referenced from 7+ files including E2E specs, `optionResolver` keying, `form/homeLoan/options.ts`, `services/homeLoanApi.ts`, and `pageFlowMap.ts`. Bindsto rename is one axis; question-ID rename is a separate one with bigger blast.
- The owner picked **Strategy B-restricted** explicitly: "first do B-restricted, reach at safest place, trace and test for secure landing then in our final attempt, before launch, we will try to clean the code." This ADR captures the decision; the HL migration is deferred to a dedicated pre-launch clean-up session that can take the full blast radius end-to-end.

**Payload builders + rule engine were NOT touched** in this pass either. They already read all the canonical key names (because the canonical bank kept the names HL has always used). The latent `selectSingleBank` / `orignalRemaningTenure` bugs they expose for LAP/Plot were known but explicitly out of scope for this safety-focused migration. Fix path captured below.

## Consequences

### Wins

- **LAP and Plot Loan now ask the same 11 BT questions HL asks.** DSAs see the same form on all three secured-loan BT/Top-up flows.
- **Plot Loan tenure is now numeric** (matches LAP + HL). The Plot-specific `TENURE_TO_MONTHS_SWITCH` workaround in the cross-EMI validator is no longer needed.
- **The `remainingTenure` field is now populated for LAP in the payload** (was silently lost to the typo). Lender BT-eligibility rules that depend on it now actually evaluate.
- **Plot Loan now captures EMIs paid + bounce history + disbursement date + rate type.** Plot was the thinnest BT-data product; it's now on par with LAP.
- **Future field additions land in one place.** `btLoanDetailsQuestions.ts` is the only schema file to change.

### Open items (deferred)

- **HL migration to canonical bank** — captures the same wins for HL + eliminates per-loan drift permanently. ~18-file blast across E2E specs + optionResolver + services. Pre-launch clean-up session.
- **Payload builder `selectSingleBank` → `bankName` fallback** — a 1-line `loanAnswers.bankName ?? loanAnswers.selectSingleBank` fix in `payloadBuilder/loanTransaction.ts:374` (and parallel sites in `casePayloadBuilder.ts:391` + `loanPayload.ts:29/50/76`) would fix the latent currentBank-undefined bug for LAP and Plot. Bundled with the HL clean-up pass for atomic review.
- **Typo fix `orignalRemaningTenure` → `originalRemainingTenure`** in `loanTransaction.ts:378` — bundled too. The LAP rename already makes the fallback unreachable, but fixing the typo is hygiene.

## Test surface

- `pnpm check` — 0 errors, 0 warnings after migration.
- `pnpm test:unit -- --run` — 11,881 tests pass (8 new round-trip + age-bounds tests added earlier in the same session, no test losses from the migration).
- 4 pre-migration snapshot fixtures regenerated with an audit trail in `_shift_notes_S78_btCanonicalBank` keys explaining every added/removed field.
- A no-op regen test at [`_regenLapSnapshots.test.ts`](../../src/lib/testing/__tests__/factory/_regenLapSnapshots.test.ts) is left in the suite as the documented path for future re-runs (gated on `REGEN_LAP_SNAPSHOTS=1`).

## Reference

- Canonical bank: [`src/lib/config/schema/btLoanDetailsQuestions.ts`](../../src/lib/config/schema/btLoanDetailsQuestions.ts)
- Rename-restraint principle: this ADR + the `existingInterestRate` correction in the 2026-05-25 evening session CHANGELOG entry.
- Pitfall #50 (cross-field plausibility): [docs/PITFALLS.md](../PITFALLS.md#50).
