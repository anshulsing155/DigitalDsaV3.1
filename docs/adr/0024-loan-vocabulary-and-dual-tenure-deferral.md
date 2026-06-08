---
type: adr
epic: tech-debt-cleanup-2026-05-31
status: accepted
last_verified: 2026-06-02
related_specs: [TECH-DEBT-CLEANUP-2026-05-31.md]
related_adrs: [ADR-0020]
test_coverage: []
owner: tech@digitaldsa.com
---

# ADR-0024 — Loan-vocabulary distinctions (DC ≠ BT), Start Fresh sunset, dead translation-layer archive, and dual-tenure deferral

**Status**: Accepted
**Date**: 2026-06-02
**Session**: S213

## Context

Three interrelated cleanup items were in scope for Session 5 of `TECH-DEBT-CLEANUP-2026-05-31` (D5 / D8 / D9). Deeper investigation surfaced two corrections to the spec's original framing plus one architectural finding that didn't have a documented home, so we record the four decisions together in one ADR.

### Background — the four-field canonical vocabulary from ADR-0020

`loanName` = the loan-product name (e.g. "Home Loan", "LAP", "Plot Loan"). `loanType` = the scope of the transaction (e.g. "New Loan", "Balance Transfer Only", "Balance Transfer With Top-up", "Top-up Only"). `facilityType` = facility structure (e.g. "Term Loan", "OD", "DOD", "CC", "Flexi DOD"). `loanVariant` = product-specific variant flag (today carries Plot Loan variants only). ADR-0020 codified this on 2026-05-31.

### Background — operational difference between BT and DC

The spec's D9 framed `'Debt Consolidation'` (DC) → `'Balance Transfer'` (BT) as a simple rename target. Owner clarification on 2026-06-02 surfaced an industry distinction that makes this rename incorrect:

- **Balance Transfer (BT)**: one customer's ONE existing loan moves from ONE bank to ANOTHER bank. Single foreclosure, single credit-relationship shift. Lender-side product is often a dedicated "BT" variant.
- **Debt Consolidation (DC)**: customer's MULTIPLE existing loans (potentially across several banks) are combined into ONE new loan at ONE lender. Multiple closures coordinated, more complex underwriting. Lender-side product is usually a "Personal Loan with DC variant" or similar.

DC and BT are operationally distinct customer journeys. Banks underwrite them under different policies. Renaming DC → BT in our schema would conflate two real distinctions.

### Background — `mapLoanType.ts` was always dead code

`src/lib/utils/mapLoanType.ts` defined a function that supposedly translated `'Debt Consolidation' → 'Balance Transfer'` at submission. Investigation found it was imported in 3 unsecured form `+page.svelte` files (Personal / Business / Professional) but **never invoked** anywhere — verified via `Grep "mapLoanType\(" src/` returning zero call sites. The "translation layer" was a fiction. Form-side `loanType` flowed through to the engine raw with no transformation.

### Background — `'Start Fresh with New Loan'` legacy value

`formSchema.json` `q4_loanType` exposed `'Start Fresh with New Loan'` as one of two options when an unsecured loan applicant said they had running obligations (the other option: `'Debt Consolidation with Extra Funds'`). The legacy auto-rules in `firstPage/rules.ts` that historically used to set this value had become a no-op (documented in the file's own docstring). MongoDB count query against production (`scripts/d8-count-start-fresh-legacy.mjs`) verified **zero stored cases** used the legacy value across three fields (`FormSnapshots.applicationData.loanType`, `FormSnapshots.applicationData.q4_loanType`, `LenderResultsSnapshots.payload.loanTransaction.loanType`).

### Background — dual-tenure engine code

Commit `8e73d2cc` (2026-05-28, BUG-E audit closeout) added a dual-tenure FOIR/EMI calculation path for BT+Top-up cases. Audit math: for ₹30L BT + ₹10L top-up at 9%, single-tenure under-states EMI by ~₹12k/mo (~33%), over-states FOIR-eligible amount, lights GREEN on cases that should be AMBER/RED. The fix was real and correct for the lender behavior the audit assumed: lenders that open TWO separate backend loans with different tenures.

The fix gates on `loanType === 'Balance Transfer With Top-up'` and applies the dual-tenure math UNIVERSALLY across all lenders that hit the gate. Owner clarification on 2026-06-02 surfaced that this is over-generalized: real lenders fall into three groups:

1. **Single-loan-backend lenders** open ONE combined loan; single-tenure math is correct for them; current engine OVER-states their EMI.
2. **Dual-loan-backend lenders** open TWO separate loans; dual-tenure math is correct (the audit's target case).
3. **Conditional lenders** flip per case — most commonly collapsing to single when the customer's chosen base tenure fits within the lender's top-up tenure cap.

The fix landed 2026-05-28 but the gate string-comparison was broken until S207 (`535e99da`, 2026-05-31) — the gate compared against UI abbreviation `'BT + Top-up'` instead of canonical `'Balance Transfer With Top-up'`. So in practice the dual-tenure path was silently dead in production for the 3-day window between authoring and S207's fix. Effectively the path has been firing for ~2 days as of this ADR.

## Decision

### D-1. DC and BT are separate names forever; no rename happens

`'Debt Consolidation'` and `'Debt Consolidation with Extra Funds'` stay as form-side and engine-side vocabulary for unsecured loans. They are NOT renamed to `'Balance Transfer Only'` / `'Balance Transfer With Top-up'`. The two concepts are operationally distinct customer journeys with different lender-side underwriting paths, and conflating them under one canonical name would lose real product information.

This decision is final. A future session that tries to "complete the canonical alignment" by renaming DC → BT must re-read this ADR first.

### D-2. The dead `mapLoanType.ts` translation layer is archived

`src/lib/utils/mapLoanType.ts` was moved to `src/lib/utils/_archive/mapLoanType-S213.ts` per the never-delete protocol. The 3 phantom imports in the unsecured form `+page.svelte` files were removed. The function's documented mapping (DC → BT) was conceptually incorrect per D-1 — keeping or invoking the function would have been the wrong fix.

### D-3. The `'Start Fresh with New Loan'` legacy value is sunset

`formSchema.json` `q4_loanType` options: the `'Start Fresh with New Loan'` option's **value** is changed to canonical `'New Loan'`. The user-facing **label** stays as "Start Fresh with New Loan" because that wording is clearer than bare "New Loan" for users with running obligations choosing between "ignore my obligations and just give me a new loan" vs "consolidate them with extra cash."

Consumer chain cleanup:
- `closureOptions.ts` — `'Start Fresh with New Loan'` branch removed; new `'New Loan'` value already caught by the existing `loanType == 'New Loan'` branch above it.
- `src/lib/form/firstPage/rules.ts` archived to `_archive/firstPage-rules-S213.ts` (the function was already a no-op; the lone caller was removed too).
- `how-can-we-help/+page.svelte` — `applyAutoLoanRules` import and call site removed.
- `fixtureProfiles.test.ts` — `'Start Fresh with New Loan'` removed from the valid-loanTypes set.

MongoDB safety: count query verified zero stored cases used the legacy value before sunset, so no migration script was needed.

### D-4. The per-lender BT+Top-up treatment flag is DEFERRED, with the full design preserved for the future implementation session

The current engine's universal `dualTenureEligible` gate is acknowledged to be over-generalized. The fix is to add a per-lender policy field `bt_topup_treatment` to `ParsedLenderRuleDocument`:

```typescript
bt_topup_treatment?:
    | 'single_tenure'
    | 'dual_tenure'
    | { single_when: object /* JSON-Logic predicate over the payload */ };
```

Resolution at engine time: `undefined` defaults to `'dual_tenure'` (preserving current behavior); static string forms apply unconditionally; the object form runs the JSON-Logic predicate against the payload to flip between modes per case. Most common conditional rule: collapse to single-tenure when the customer's chosen base tenure (in months) is ≤ the lender's top-up tenure cap (years × 12).

**Why deferred this session:**

The flag is only useful once each lender's actual backend treatment is audited and recorded in their rule document. Without that audit, every lender's rule doc has the field as `undefined` → the flag does nothing but add a complexity scaffold. Shipping the flag without the audit work delivers zero behavior change today and a fully tested but unused code path.

The full design is preserved in three places so a future audit session has a ready blueprint:

1. **`docs/PITFALLS.md` #69** — full code shape for the discriminated union, the resolver function, the engine gate edit, and example `single_when` predicates. Includes a heuristic detection grep for any new code that re-encodes the universal assumption.
2. **`src/lib/ruleEngine/evaluationEngine.ts:854-905`** — a `KNOWN LIMITATION` comment block above the existing BUG-E fix records the assumption, the deferral rationale, and points at PITFALLS.md #69 + this ADR.
3. **`TECH-DEBT-CLEANUP-2026-05-31.md` §6** — an incoming-debt entry tracks this as a known future cleanup item.

When the lender-policy audit is in scope (with team input on each lender's actual backend treatment), the engine change becomes a focused refactor with the design already specified.

## Consequences

- **Vocabulary stays heterogeneous between secured and unsecured.** Secured loans use canonical scope values (`'New Loan'` / `'Balance Transfer Only'` / `'Balance Transfer With Top-up'` / `'Top-up Only'`); unsecured loans use scope values that include `'Debt Consolidation'` / `'Debt Consolidation with Extra Funds'`. This is now codified as intentional. The engine reads `loanType` raw and only the secured-BT scope values activate dual-tenure paths.
- **`mapLoanType.ts` archive is final.** Restoring the file or reintroducing a DC→BT mapping is forbidden absent a new ADR that overrides D-1.
- **The legacy `'Start Fresh with New Loan'` value is gone from new submissions.** Production data was empty at sunset (verified). UI label preserved for clarity.
- **Engine math for BT+Top-up cases is unchanged from the current state.** Lenders that should be single-tenure continue to receive over-stated EMI estimates. This is a known limitation tracked in PITFALLS.md #69 + §6 + the engine comment block. The deferral is honest engineering — no behavior surprise today, with a ready-to-execute design for the day the lender audit ships.
- **No new fields in `ParsedLenderRuleDocument` this session.** The interface is unchanged. Existing rule docs need no migration.

## Alternatives Considered

1. **Rename DC → BT mechanically across 25+ files (the spec's original D9 framing).** Rejected. The two concepts are operationally distinct; the rename would lose real product distinction. See D-1.

2. **Ship the per-lender `bt_topup_treatment` flag now with `'dual_tenure'` default.** Considered seriously and approved by owner mid-session, then re-evaluated after investigation surfaced that the flag does nothing today without the lender audit. The complexity cost (discriminated union, JSON-Logic resolver, doubled test surface, sample rule doc updates, operator log noise) buys nothing until each lender's rule doc gets a real value. See D-4.

3. **Revert the BUG-E dual-tenure fix entirely.** Rejected. The fix addresses a real ~₹12k/mo EMI under-statement at lenders that genuinely use dual-tenure backend. Reverting reintroduces a documented bug. The current state is wrong for some lenders but right for others; reverting would be wrong for the other half.

4. **Add 4 new form questions to support unsecured DC+Extra payload-bridge fields (`principalOutstanding`, `topUpAmount`, dual tenures).** Investigation found the data already exists in the form via the per-obligation `selectedToClose` flag and the Loan Requirements page's loanAmount field (in DC+Extra context, that field captures the "extra" amount only). What's missing is a payload-builder bridge to derive transaction-level `principalOutstanding` from obligations marked "Close by this new loan". Logged to §6 as a separate future improvement opportunity, not in this session's scope (the bridge only matters once the per-lender flag is also in place to gate when dual-tenure math should actually fire).

## References

- ADR-0020 — four-field canonical vocabulary (`loanName` / `loanType` / `facilityType` / `loanVariant`)
- `docs/specs/_archive/TECH-DEBT-CLEANUP-2026-05-31.md` — parent cleanup spec (shipped + archived S215); D5 / D8 / D9 covered here
- `docs/PITFALLS.md` #69 — BT+Top-up dual-tenure hardcoded assumption + full per-lender flag design
- `src/lib/ruleEngine/evaluationEngine.ts:854-905` — engine code with KNOWN LIMITATION block
- Commit `8e73d2cc` (2026-05-28) — original BUG-E dual-tenure fix
- Commit `535e99da` (S207, 2026-05-31) — repaired the BT+Top-up gate string comparison
- `scripts/d8-count-start-fresh-legacy.mjs` — MongoDB pre-flight count script
- `src/lib/utils/_archive/mapLoanType-S213.ts` — archived dead translation layer
- `src/lib/form/_archive/firstPage-rules-S213.ts` — archived no-op auto-rules
