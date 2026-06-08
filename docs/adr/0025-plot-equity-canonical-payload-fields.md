---
type: adr
epic: LEND-1
status: accepted
last_verified: 2026-06-02
related_specs: [PLOT-EQUITY-LOAN-DESIGN.md]
related_adrs: [ADR-0020, ADR-0021]
test_coverage: [src/lib/testing/__tests__/plotEquityCanonicalFields.test.ts]
owner: tech@digitaldsa.com
---

# ADR-0025 — Plot & Equity Loan canonical payload field aliasing

**Status**: Accepted
**Date**: 2026-06-02
**Session**: S217 (LEND-1 Phase 1b + 1c)

## Context

LEND-1 Phase 1b ([`PLOT-EQUITY-LOAN-DESIGN.md` §5](../specs/PLOT-EQUITY-LOAN-DESIGN.md)) calls for explicit `marketValue` and `registryValue` fields in the payload for Plot & Equity Loan, plus a derived `sellerCashComponent` (= market − registry). These are the inputs the engine's 3-cap calculation (Phase 2) reads, and they're the unambiguous names the AI parser's keyRegistry / termDictionary will reference (Phase 1c).

When we audited the codebase, two facts emerged that shaped the implementation choice:

1. **The payload type already declares `marketValue` and `registryValue`** (in [`payloadBuilder/types.ts:550-552`](../../src/lib/utils/payloadBuilder/types.ts), under the "V2 three-cost model" comment block — part of the Home Loan redesign). The builder reads them at [`loanTransaction.ts:199-208`](../../src/lib/utils/payloadBuilder/loanTransaction.ts). Plumbing exists; data source is missing for Plot Loan.

2. **The Plot & Equity form ALREADY collects the two semantic concepts** under overloaded names. `propCost` for Plot & Equity carries the assessed market value — see the question wording at [`plotLoan/questionBank/loanRequirement.ts:176`](../../src/lib/config/plotLoan/questionBank/loanRequirement.ts): *"What is the assessed market value of the property or the agreed-upon deal value with the seller?"*. `agreementSellValue` carries the registry value.

The work needed is a **wiring change** — connect the data Plot & Equity already collects to the canonical names the rest of the system expects — not a form redesign or a full rename.

The full-rename option (rename `propCost → marketValue` and `agreementSellValue → registryValue` across all 6 secured loans) was considered and rejected because: (a) ~290 live-code occurrences across ~50 src files, comparable in scope to the just-shipped FORM-4 rename, demanding ~6 hr of dedicated work; (b) `propCost` is semantically a UNION across loan variants (Direct Sale deal price ≠ market valuation strictly), so renaming it everywhere mildly stretches semantics for the Direct Sale case; (c) the LEND-1 critical path is the engine 3-cap calc (Phase 2), not nomenclature cleanup.

## Decision

For Plot & Equity Loan only, mirror existing form answers into the canonical V2 payload keys inside the payload builder:

```typescript
if (loanVariant === 'Plot & Equity Loan') {
  if (payload.marketValue === undefined) {
    const fromPropCost = toNumber(loanAnswers.propCost);
    if (fromPropCost) payload.marketValue = fromPropCost;
  }
  if (payload.registryValue === undefined) {
    const fromAgreement = toNumber(loanAnswers.agreementSellValue);
    if (fromAgreement) payload.registryValue = fromAgreement;
  }
  if (
    payload.marketValue !== undefined &&
    payload.registryValue !== undefined &&
    payload.marketValue > payload.registryValue
  ) {
    payload.sellerCashComponent = payload.marketValue - payload.registryValue;
  }
}
```

The block is gated on `loanVariant === 'Plot & Equity Loan'` so it has **zero effect on any other loan type**. The `=== undefined` guards mean a future form that binds directly to `marketValue` / `registryValue` will take precedence — no double-write.

`sellerCashComponent` is computed only when both values are present and market > registry (the normal Plot & Equity shape — the variant exists precisely because there's a gap). When inputs are degenerate (market ≤ registry, or either missing), the field stays undefined and downstream consumers (engine Phase 2, offer card Phase 4) handle the absence gracefully.

Phase 1c (the keyRegistry + termDictionary entries) records the three fields as `source: 'computed'`, with `products: ['Plot and Construction Loan']`. CI Rule B (the "bindsTo must exist in form config" check) correctly skips computed-source entries.

The `'market value'` alias was also removed from `propCost`'s termDictionary entry in the same change — once `marketValue` is a real canonical key, having `propCost` claim the same surface form would confuse the AI parser's normalisation step.

## Sunset trigger (CLAUDE.md §16 Rule #15)

This block is "kept for back-compat" code by construction. The aliasing exists because the form layer hasn't caught up to the canonical names yet — that's debt, not architecture. Delete the entire `if (loanVariant === 'Plot & Equity Loan')` block when **either** of these lands:

- **(a) Plot Loan form gets dedicated `marketValue` and `registryValue` questions.** At that point the existing `propCost` / `agreementSellValue` chain for Plot & Equity becomes dead code on the form layer; remove both the questions and this aliasing block in one PR. Lock test should be updated to assert the new bindsTo paths and the absence of the alias block.

- **(b) App-wide `propCost → marketValue` and `agreementSellValue → registryValue` rename ships.** At that point every secured loan's form answer lands under the canonical name; the dedicated Plot & Equity branch becomes redundant — the generic readers at `loanTransaction.ts:199-208` cover it. Delete this block as part of that rename's cleanup commit.

The lock test (`plotEquityCanonicalFields.test.ts`) guards the current canonical state: when either trigger fires and this block is removed, the test will need to be updated in lockstep. That's the intended forcing function — the test exists so the cleanup can't silently regress.

## Consequences

**Enables:**
- Engine (Phase 2) reads the unambiguous canonical names `payload.marketValue` / `payload.registryValue` / `payload.sellerCashComponent` for the 3-cap calculation. No purchase-type or variant-aware branching needed at the engine layer.
- AI parser (Pass 1 normalisation) recognises lender-policy phrases like "market value", "fair market value", "stamp duty value", "registry value" and routes them to the new canonical names. Removes the ambiguity in `propCost` (which currently has to disambiguate via the `purchaseType` context).
- Offer card UI (Phase 4) consumes `sellerCashComponent` as a first-class number, surfacing the off-paper cash demand the buyer must satisfy — a DSA conversation point that's invisible in the current single-sanction-headline UI.
- ₹1Cr market / ₹20L registry / ₹80L seller cash component (the gold-standard fixture from `PLOT-EQUITY-LOAN-DESIGN.md` §3) flows through the payload cleanly, ready for Phase 2.

**Prevents:**
- A multi-day full rename PR with ~50 files and ~290 occurrences blocking LEND-1 Phase 2 (the engine work that's the actual critical path for this epic).
- Form UX shift — DSAs filling out Plot & Equity see the same question chain they always have.
- A "mapping layer" that other variants would have to opt into one by one — the aliasing is scoped to Plot & Equity Loan and only Plot & Equity Loan. Other Plot variants (Plot Loan Only, Plot & Construction Loan, Construction Loan Only) and other secured loans (Home Loan, LAP) are untouched.

**Accepts these trade-offs:**
- Semantic overload survives in the form layer for Plot & Equity (`propCost` carries market value; `agreementSellValue` carries registry value). The lock test surfaces this so future contributors see the alias explicitly rather than discover it by tracing.
- A second-layer "where does my data actually go?" answer for Plot & Equity readers — form bindsTo names differ from payload canonical names. The aliasing block's comment + this ADR are the discoverability path.
- The `propCost` termDictionary entry loses one alias (`'market value'`). Any AI parser run mid-flight that was about to map "market value" to `propCost` will now route it to `marketValue` instead. For Plot & Equity policies this is the correct answer; for Home / LAP / non-Plot-Equity Plot variants the parser will see no match and flag `confirmationRequired`, which is the safe failure mode (the parser doesn't guess).

## Alternatives Considered

1. **Full app-wide rename** (`propCost → marketValue` + `agreementSellValue → registryValue` across all 6 secured loans, all form pages, all journeys, all snapshots, all PMS docs, all tests). Rejected because: ~6 hr of dedicated work for ~290 live-code occurrences; the FORM-4 hard-cutover rename just shipped two days ago and the team's appetite for another rename cycle is low; Plot Loan's `propCost` semantically is "deal value" for Direct Sale (not market valuation), so the rename mildly degrades semantic accuracy for cases unrelated to LEND-1. **Not closed forever** — when LEND-1 Phase 2 demands the canonical names everywhere (or when a future form pass reorganises Plot Loan questions), the rename becomes proportionate. This ADR's sunset trigger (b) is the explicit hand-off.

2. **Add two new explicit questions to the Plot & Equity form** (Option A in the planning session — `q6_marketValue` and `q7_registryValue` gated on `loanVariant === 'Plot & Equity Loan'`). Rejected because: every Plot & Equity DSA would fill two extra questions; the existing `propCost` + `agreementSellValue` flow already collects the same data via the existing `differentATSandPV` / `ATSReady` / `ATSvalue` chain; adding new questions without removing the old ones would create a UX confusion (which question wins?); and the deprecation of the old chain is a substantial form redesign that LEND-1 doesn't need.

3. **Override `bindsTo_template` at the question level for Plot & Equity** (Option C in the planning session — same Q&A flow, but the same currency question writes to `marketValue` when `loanVariant === 'Plot & Equity Loan'` and to `propCost` otherwise). Rejected because: question-level `bindsTo` override mechanism doesn't exist in the schema today; inventing it for one use case is over-engineering; the same effect is achievable in the payload builder with five lines of code and one ADR; and a `bindsTo` override would split the answer storage in form state between two keys depending on variant, complicating restore-from-snapshot and form-edit flows.

4. **Read both `propCost` AND `marketValue` from the engine** (no payload-builder change; engine does the `var: marketValue ?? var: propCost` dance in JSON-Logic). Rejected because: it leaks the legacy field name into JSON-Logic policy expressions written by the AI parser, which then has to know about the alias too — defeats the purpose of giving the parser unambiguous canonical names. The payload builder is the right layer because it's the boundary where form-layer naming becomes engine-layer naming.

## References

- Spec: [`docs/specs/PLOT-EQUITY-LOAN-DESIGN.md`](../specs/PLOT-EQUITY-LOAN-DESIGN.md) — 4-phase roadmap; this ADR closes Phase 1b + 1c
- ADR-0020: [`0020-loan-field-nomenclature.md`](0020-loan-field-nomenclature.md) — the FORM-4 hard-cutover pattern that we explicitly chose NOT to repeat here
- ADR-0021: [`0021-plot-equity-loan-modeling.md`](0021-plot-equity-loan-modeling.md) — the 3-cap structure this aliasing serves
- Code: [`src/lib/utils/payloadBuilder/loanTransaction.ts`](../../src/lib/utils/payloadBuilder/loanTransaction.ts) — the aliasing block
- Code: [`src/lib/utils/payloadBuilder/types.ts`](../../src/lib/utils/payloadBuilder/types.ts) — `sellerCashComponent` added to `LoanTransactionPayload`
- Code: [`src/lib/config/pms/keyRegistry.ts`](../../src/lib/config/pms/keyRegistry.ts) + [`registryChangelog.ts`](../../src/lib/config/pms/registryChangelog.ts) — Phase 1c keyRegistry entries
- Code: [`src/lib/config/pms/termDictionary.ts`](../../src/lib/config/pms/termDictionary.ts) — Phase 1c parser-vocabulary entries
- Test: [`src/lib/testing/__tests__/plotEquityCanonicalFields.test.ts`](../../src/lib/testing/__tests__/plotEquityCanonicalFields.test.ts) — lock test guarding the aliasing + variant gating
