# Plot & Equity Loan — design spec

**Status:**
- **Phase 1a** (Pitfall #33 canonical-decision) ✅ **complete 2026-05-31** via the FORM-4 loan-field nomenclature rename. Canonical answer locked + verified in S215 closure (see §5 Phase 1a below for the file:line proof).
- **Phase 1b** (canonical payload fields: `marketValue`, `registryValue`, `sellerCashComponent`) ✅ **complete 2026-06-02** via [ADR-0025](../adr/0025-plot-equity-canonical-payload-fields.md) — aliasing in `payloadBuilder/loanTransaction.ts` rather than full app-wide rename. `buyerMarginOnRegistered` deferred to Phase 2 (per-lender Y% dependency). Lock test: [`plotEquityCanonicalFields.test.ts`](../../src/lib/testing/__tests__/plotEquityCanonicalFields.test.ts).
- **Phase 1c** (keyRegistry + termDictionary updates) ✅ **complete 2026-06-02** — 3 entries added per ADR-0025 (`source: 'computed'`); `propCost`'s `'market value'` alias removed to avoid parser ambiguity with the new `marketValue` canonical key.
- **Phase 2** (engine 3-cap calc) ✅ **complete 2026-06-02** — three new parameter keys in `evaluationEngine.ts` (`plot_equity_overall_sanction_ltv` / `plot_equity_seller_disbursement_cap` / `plot_equity_lap_on_plot_cap`) plus four new fields on `LenderEvaluation` + `LenderResult` (`plot_equity_sanction_headline` / `plot_equity_seller_disbursement` / `plot_equity_buyer_cash_component` / `plot_equity_buyer_net_out_of_pocket`). Gated on `loanVariant === 'Plot & Equity Loan'` + all three caps present + market + registry values present. Legacy `offered_amount` math untouched — Phase 4 UI consumes the 4 new fields. Lock test: [`plotEquity3CapEngine.test.ts`](../../src/lib/testing/__tests__/ruleEngine/plotEquity3CapEngine.test.ts).
- **Phase 3** (parser spec additions for the AI policy parser) ✅ **complete 2026-06-02**. `LOAN_POLICY_PARSER_SPEC_V7.md` gained: (a) Plot Loan variant block explaining `loanVariant` vs `loanType` with synonym table; (b) Plot & Equity 3-cap framework block with rules / schema variables / gold-standard fixture / common mistakes / quick reference / validation checklist; (c) §26-28 numbered section entries showing parameter-tier JSON-Logic for `plot_equity_overall_sanction_ltv` / `plot_equity_seller_disbursement_cap` / `plot_equity_lap_on_plot_cap`; (d) updates to Key Mappings + Common Mistakes + Quick Reference tables for `marketValue` / `registryValue` / `loanVariant`. Spec grew 2,636 → 2,945 lines (+309). Term dictionary already had the canonical names from Phase 1c; no further dictionary work needed.
- **Phase 4** (offer-card UI showing 4-number breakdown + file-builder PDF mirror) ✅ **complete 2026-06-02**. **Part A (Offer card UI)** — new `LenderPlotEquityBreakdown.svelte` mirrors the `LenderTrancheBreakdown` pattern; mounts conditionally in `LenderResultCard.svelte` between the metrics row and AffordabilityBreakdown when all 4 `plot_equity_*` fields are populated. Presence-check IS the variant gate — no separate `loanVariant` prop plumbing. Additive layout (standard Amount/ROI/EMI/Tenure metrics row stays). **Part B (File-builder PDF)** — new `lender_offer` section added to all 3 default section lists (secured / unsecured / personal); `buildFilePayload` accepts an optional `lenderResult` parameter; new `buildLenderOfferSection` helper renders Sanction/ROI/EMI/Tenure for all loan types and nests a "Plot & Equity Breakdown" sub-section with the 4 numbers when those fields are present. File-builder API GET + POST endpoints load the latest `LenderResultsSnapshot` via new `findLenderResultForApplication` helper. Lock test `fileBuilderLenderOffer.test.ts` (5 tests) covers: no-section-without-result; standard fields; 4-number breakdown gated correctly; section_visibility hide; non-Equity Plot Loan unaffected. Tests 12,939 → 12,944 (+5), type-check 0/0.
**Companion memory:** `~/.claude/.../memory/reference_plot_equity_loan_mechanics.md`

This doc captures the design for properly handling Plot & Equity Loan in the engine, schema, parser spec, and UI. It is the implementation roadmap when work starts — until then it serves as the reference for *what we know we're missing*.

---

## 1. Problem statement (in plain English)

DigitalDSA currently has form-side plumbing for Plot & Equity Loan as one of the 4 plot variants (`Plot Loan Only` / `Plot & Construction Loan` / `Plot & Equity Loan` / `Construction Loan Only`), but the rule engine has zero specific logic for it. The offer card shows a single sanction number that does not reflect what the customer will actually receive.

The actual product is **two loan files at the lender** (a Plot Loan to fund the seller, plus a Loan Against Property to give the buyer cash on the same plot as collateral), bounded by three independent caps. The combined disbursement is typically lower than the headline sanction by a meaningful margin — invisible today.

HDFC and Axis are the live examples in the Indian market.

---

## 2. The lender rule structure

Three independent caps, acting at three points in the deal. Per-lender percentages vary; the SHAPE is universal.

**Rule 1 — Headline sanction.** Total commitment from the lender. Formula: `sanctioned = X% × Market Value`. The X is per-lender (example: 70%).

**Rule 2 — Seller disbursement cap.** Seller cannot receive more than the LOWER of:
- `Y% × Registry Value` (Y assumes the buyer brings the remaining margin on the registered portion; example: Y=90%, buyer brings 10%)
- The full sanction headline from Rule 1

**Rule 3 — Buyer cash disbursement (the LAP component).** Buyer cannot receive more than the LOWER of:
- `Z% × Market Value` (Z is the lender's LAP-on-plot ceiling; example: Z=40%)
- Whatever sanction is left after the seller's portion (`sanction − seller portion`)

The "remaining sanction" term in Rule 3 enforces the combined-cap guarantee: seller portion + buyer portion can NEVER cross the sanction headline.

---

## 3. Gold-standard worked example (the reference test case)

Owner provided this on 2026-05-29. Every implementation choice in this spec should produce these exact numbers when fed these inputs.

| Input | Value |
|---|---|
| Market value | ₹1,00,00,000 |
| Registry value | ₹20,00,000 |
| Seller's off-paper cash demand | ₹80,00,000 |

**With lender percentages X=70%, Y=90%, Z=40%** (the example pattern):

| Step | Formula | Result |
|---|---|---|
| Sanction headline | 70% × ₹1Cr | **₹70,00,000** |
| Seller disbursement | min(90% × ₹20L, ₹70L) = min(₹18L, ₹70L) | **₹18,00,000** |
| Sanction remaining after seller | ₹70L − ₹18L | ₹52,00,000 |
| Buyer cash disbursement | min(40% × ₹1Cr, ₹52L) = min(₹40L, ₹52L) | **₹40,00,000** |
| Total disbursed | Seller + Buyer | **₹58,00,000** |
| Unused sanction | ₹70L − ₹58L | ₹12,00,000 |
| Buyer's net out-of-pocket | (₹20L − ₹18L) + (₹1Cr − ₹20L) − ₹40L | **₹42,00,000** |

The ₹42L buyer net is the most important number for the DSA's customer conversation. Today's offer card shows none of this breakdown.

---

## 4. Current state audit (2026-05-29)

### What exists

- **Form plumbing for variant** — Plot & Equity is one of 4 values in `commonPage.json` (PlotLoanActivity question). Conditional questions exist in `plotLoan/questionBank/loanRequirement.ts` and `propertyLegal_Plot.ts` for Plot & Equity cases.
- **Some related fields collected** — `agreementSellValue` (registered sale value), `ATSvalue` (registry value), `mortgageYear`, `deposit`, `requiredExtraAmount`, `propCost`, `ATSReady` (whether ATS doc is in hand).
- **Pre-existing fixture** — `PLOT-EQUITY.pre-migration.json` exists under test snapshots.

### What is missing

- **No clean market-vs-registry distinction in the payload.** `propCost` is overloaded (Direct Sale vs Resale already noted in parser spec V7's propCost-vs-dealValue block). No field explicitly captures "market value" as distinct from "registry value" / "agreement value" for Plot & Equity.
- **No engine logic for the 3-layered cap.** `grep "Plot.*Equity" src/lib/ruleEngine` returns nothing. The engine treats all plot variants identically — single LTV-based sanction calculation.
- **No `policyTypes.ts` schema for seller-disbursement or LAP-on-plot caps.** PMS team has nowhere to put per-lender Y% and Z% even if they had them.
- **No parser spec coverage for Plot & Equity.** `LOAN_POLICY_PARSER_SPEC_V7.md` has the propCost-vs-dealValue block but no Plot & Equity 3-cap framework, no `PlotLoanActivity` term dictionary.
- **No offer card breakdown.** Shows a single sanction number. The four-number breakdown (sanction / seller / buyer cash / buyer net) is missing.
- **Field-name confusion (Pitfall #33).** Plot Loan's variant lives in `loanType` (not `PlotLoanActivity` as the bindsTo suggests). See [[reference-plot-loan-field-naming]] memory for details.

### Prior deferral

CHANGELOG (around 2026-04) noted: "Plot & Equity LTV cap is a lender-policy gap, belongs in PMS rule documents per-lender." That was half-right (per-lender percentages ARE PMS work), but half-wrong — the engine has no SHAPE for the 3-layered cap, so PMS has nowhere to put the percentages.

---

## 5. Implementation plan — 4 phases

Estimated 7-10 days engine work + per-lender percentage fills by PMS team for the 9 existing lenders. Phases can ship independently in this order.

### Phase 1 — Schema cleanup (2-3 days)

**1a. Resolve Pitfall #33 (field-name overload).** ✅ **CLOSED 2026-05-31 by FORM-4** (the loan-field nomenclature rename). The question this section originally posed — "does the variant live in `loanType` or `PlotLoanActivity`?" — was answered by the rename:

- `loanType` carries SCOPE uniformly across all 6 loans. Values: `'New Loan'` / `'Balance Transfer Only'` / `'Top-up Only'` / `'Balance Transfer With Top-up'`.
- `loanVariant` (new field, Plot only) carries the Plot VARIANT. Values: `'Plot Loan Only'` / `'Plot & Construction Loan'` / `'Plot & Equity Loan'` / `'Construction Loan Only'`.
- `PlotLoanActivity` is RETIRED. Legal occurrences are restricted to: `_archive/` source paths, `_archived_*/` route paths, `__snapshots__/` pre-migration fixtures, and the negative-assertion target in `loanFieldNomenclatureLock.test.ts`.

S215 verified canonical state across the live code (see [`docs/specs/_archive/TECH-DEBT-CLEANUP-2026-05-31.md`](_archive/TECH-DEBT-CLEANUP-2026-05-31.md) §0 S215 row for the audit detail):

| Verification point | File:line | What it proves |
|---|---|---|
| Pitfall #33 obsolete marker matches code | `docs/PITFALLS.md:914` | Canonical state documented in the obsolete-marker body |
| Payload builder reads canonical fields | `src/lib/utils/payloadBuilder/loanTransaction.ts:69-70, 72-82, 119-130` | Scope-aware BT/Top-up branch reads `loanType`; Plot variant branch reads `loanVariant` |
| Engine reads canonical scope field | `src/lib/ruleEngine/evaluationEngine.ts:1043-1045` | Comment cites the rename; reads `payload.loanTransaction.loanType` |
| Lock test enforces legacy-name absence | `src/lib/testing/__tests__/loanFieldNomenclatureLock.test.ts:41` | `LEGACY_NAMES = ['PlotLoanActivity', 'LAPType', 'unSecureLoanType']` — guard against re-introduction |
| Only remaining live `PlotLoanActivity` reference | `src/routes/(app)/form/plot-loan/+page.svelte:975-977` | Inside dead `payloadNew` scaffolding for the dormant bank-loan-management shim. Documented in S214 D7 commit + S215 A's removal of the adjacent patches; will be cleaned up in Phase 2 payload redesign (~150 lines unblocked by S215 A's lock reform) |

**No code change needed in 1a beyond what's already shipped.** The rename did the work; this section documents the canonical answer so a future contributor reading the spec sees the decision is locked.

**Sunset trigger for this Phase 1a entry**: when LEND-1 Phase 2 ships the payload redesign and removes the dead `payloadNew` scaffolding at `plot-loan/+page.svelte:975-977`, this whole 1a section can be deleted — Pitfall #33's obsolete-marker and the canonical-rename test will be the durable source of truth.

**1b. ✅ Closed 2026-06-02 via [ADR-0025](../adr/0025-plot-equity-canonical-payload-fields.md).**

Approach actually shipped: alias inside the payload builder rather than add explicit form questions or run an app-wide rename. The Plot & Equity form already collects the two semantic concepts under overloaded names (`propCost` carries assessed market value per the question wording at [`plotLoan/questionBank/loanRequirement.ts:176`](../../src/lib/config/plotLoan/questionBank/loanRequirement.ts); `agreementSellValue` carries the registry/ATS value). The payload builder mirrors these into the canonical V2 keys for Plot & Equity Loan only:

```typescript
if (loanVariant === 'Plot & Equity Loan') {
  payload.marketValue ??= toNumber(loanAnswers.propCost);
  payload.registryValue ??= toNumber(loanAnswers.agreementSellValue);
  if (marketValue > registryValue) {
    payload.sellerCashComponent = marketValue - registryValue;
  }
}
```

Field-by-field outcome:
- `marketValue` ✅ aliased from `propCost` (Plot & Equity branch only). Direct-write precedence preserved via `=== undefined` guards.
- `registryValue` ✅ aliased from `agreementSellValue` (Plot & Equity branch only). Same direct-write precedence.
- `sellerCashComponent` ✅ derived from `marketValue − registryValue` when both are present and market > registry. Type added to `LoanTransactionPayload`.
- `buyerMarginOnRegistered` ⚪ **deferred to Phase 2** — needs per-lender Y%, which is engine-level concern. Will be computed per offer in the lender result, not in the loan-level payload.

The aliasing block carries an explicit sunset trigger per CLAUDE.md §16 Rule #15 — delete when EITHER (a) Plot Loan form gains dedicated `marketValue` / `registryValue` questions, OR (b) app-wide `propCost → marketValue` / `agreementSellValue → registryValue` rename ships. ADR-0025 records both triggers.

Verification:
- Lock test [`plotEquityCanonicalFields.test.ts`](../../src/lib/testing/__tests__/plotEquityCanonicalFields.test.ts) covers the gold-standard ₹1Cr / ₹20L / ₹80L fixture + variant gating (other 3 Plot variants + Home + LAP unaffected) + direct-write precedence + degenerate inputs.

**1c. ✅ Closed 2026-06-02.**

- [`keyRegistry.ts`](../../src/lib/config/pms/keyRegistry.ts) — 3 new entries (`marketValue`, `registryValue`, `sellerCashComponent`), all `source: 'computed'`, `products: ['Plot and Construction Loan']`. CI Rule B (the "bindsTo must exist in form config" check) correctly skips computed-source entries.
- [`registryChangelog.ts`](../../src/lib/config/pms/registryChangelog.ts) — matching audit entries per the registry's append-only rule.
- [`termDictionary.ts`](../../src/lib/config/pms/termDictionary.ts) — `marketValue` entry with aliases (appraised value / fair market value / lender valuation / valuer estimate / assessed market value); `registryValue` with aliases (stamp duty value / circle rate value / sale deed value / agreement to sell value / ATS value / declared value / documented value); `sellerCashComponent` with aliases (off-paper cash / seller's cash demand / unregistered cash portion). The `propCost` entry's `'market value'` alias was removed to prevent parser ambiguity (a Plot & Equity policy doc mentioning "market value" now routes to the correct canonical key).

### Phase 2 — Engine rule shape ✅ closed 2026-06-02

Shipped end-to-end in one session (sized 3-4 days in the original estimate). Final shape:

**Three new parameter keys** in [`evaluationEngine.ts`](../../src/lib/ruleEngine/evaluationEngine.ts) extraction table (no new policy-types interface needed — the PMS parameter-rule pipeline already supports adding keys without schema-side changes):
- `plot_equity_overall_sanction_ltv` → X% of marketValue (Rule 1)
- `plot_equity_seller_disbursement_cap` → Y% of registryValue (Rule 2)
- `plot_equity_lap_on_plot_cap` → Z% of marketValue (Rule 3)

**Engine math branch** at [`evaluationEngine.ts`](../../src/lib/ruleEngine/evaluationEngine.ts) (after the existing LTV/LCR block, before `calculateOfferedAmount`). Gated tightly: `loanVariant === 'Plot & Equity Loan'` AND market + registry both positive AND all three caps supplied by the rule doc. When the branch fires:

```
sanction         = marketValue × X%
sellerPortion    = min(registryValue × Y%, sanction)
remainingSanction = max(0, sanction − sellerPortion)
buyerCashPortion = min(marketValue × Z%, remainingSanction)
buyerMarginOnRegistered = max(0, registryValue − sellerPortion)
sellerOffPaperDemand    = max(0, marketValue − registryValue)
buyerNetOutOfPocket     = max(0, buyerMarginOnRegistered + sellerOffPaperDemand − buyerCashPortion)
```

**Four new optional fields** on both [`LenderEvaluation`](../../src/lib/ruleEngine/types.ts) (intermediate) and [`LenderResult`](../../src/lib/types/lenderResults.ts) (final):
- `plot_equity_sanction_headline` — what the lender committed to (the headline number)
- `plot_equity_seller_disbursement` — what goes to seller's account
- `plot_equity_buyer_cash_component` — what comes to buyer as cash from the LAP file
- `plot_equity_buyer_net_out_of_pocket` — what buyer must bring from own pocket (DSA conversation number)

**What was DELIBERATELY NOT changed:**
- `offered_amount` math is untouched. Legacy LTV/LCR result remains the single number rendered today. Phase 4 UI will swap to the 4-number breakdown when it lands. Reasoning: avoid regression risk on other Plot variants + Home Loan + LAP cases that share the same engine path; Phase 2 ships ADDITIVELY.
- `policyTypes.ts` PMS-authoring schema not extended in this session. PMS team will need a structured `PlotEquityCapsConfig` interface to author per-lender X/Y/Z via the PMS UI; that's a separate small change when PMS team picks up Plot Loan lender onboarding. Until then, rule docs can reference the new parameter keys directly via the existing parameter-tier rule mechanism.
- `buyerMarginOnRegistered` is computed inline (used inside the `buyerNetOutOfPocket` formula) but not surfaced as a separate result field. Phase 4 UI can derive it from `registryValue − seller_disbursement` if needed.

**Verification:**
- Lock test [`plotEquity3CapEngine.test.ts`](../../src/lib/testing/__tests__/ruleEngine/plotEquity3CapEngine.test.ts) covers:
  - Spec §3 gold-standard ₹1Cr / ₹20L / 70-90-40 → ₹70L / ₹18L / ₹40L / ₹42L ✓
  - Owner's variant ₹1.4Cr / ₹35L / 70-90-40 → ₹98L / ₹31.5L / ₹56L / ₹52.5L ✓
  - Negative: other 3 Plot variants don't get the 4 fields
  - Negative: Home Loan + LAP don't get the 4 fields
  - Defensive: missing market / registry / any of X/Y/Z → no fields populated, no crash
- `pnpm check` 0 errors; full suite 12,939 passing (+19 from Phase 2 lock test).

### Phase 3 — Parser spec ✅ closed 2026-06-02

Shipped in one edit pass to `src/lib/config/pms/policySpec/LOAN_POLICY_PARSER_SPEC_V7.md`. Final shape:

**3a. Plot Loan variant block** — inserted right after the existing `propCost vs dealValue` critical block. Explains `loanVariant` (Plot-specific, 4 values) as a separate axis from `loanType` (scope, same across all 6 loans), with a synonym table mapping policy-document language to canonical values. Validation checklist asserts variant-specific rules gate on `loanVariant` not `loanType`.

**3b. Plot & Equity 3-cap framework block** — inserted immediately after 3a. Covers: two-loan-file structure background; the three independent caps (Rules 1-3) with parameter-key mapping; canonical schema variables (`marketValue` / `registryValue`) with policy-doc alias lists; explicit warning that `propCost` / `dealValue` are Home Loan concepts and the payload builder aliases for Plot & Equity (ADR-0025); the gold-standard ₹1Cr / ₹20L / 70-90-40 fixture as the parser's validation reference; full parameter-tier JSON-Logic example showing all 3 rules gated on `loanVariant === 'Plot & Equity Loan'`.

**3c. Common mistakes section** (woven into 3b) — three wrong patterns with concrete examples: collapsing into a single `max_ltv` rule (hides the 3-cap math), using `propCost` instead of `marketValue` (works by coincidence today, breaks at alias sunset), omitting the `applies_when` gate (leaks values to other Plot variants).

**3d. Numbered §26-28 section entries** — added at the end of §SECTION SPECIFICATIONS (right before §GOVERNANCE SECTIONS). Mirror the convention of §1-25: per-parameter JSON-Logic skeleton, conditional-variant example for §26, combined 3-rule example with engine-output mapping. The numbered entries are where parsers actually look up "what's the JSON shape for X?" — the upfront framework block teaches the WHY, §26-28 give the HOW.

**3e. Table updates** — `marketValue` + `registryValue` + `loanVariant` added to the global Key Mappings table (top of spec); two new Common Mistakes table rows for the `propCost` substitution and the `max_ltv` collapse; two new Quick Reference rows for the Plot & Equity context; new validation-checklist item for the variant.

**What was DELIBERATELY NOT changed:**
- Existing `propCost vs dealValue` block left intact — it remains correct for Home Loan / LAP. The Plot & Equity block sits AFTER it and points to the canonical alternatives.
- `termDictionary.ts` not touched — Phase 1c already added `marketValue` / `registryValue` / `sellerCashComponent` entries. The parser spec block lists the policy-doc aliases for documentation; the runtime dictionary already covers them.
- No code or test changes — Phase 3 is documentation that surfaces the existing Phase 1b/1c/2 implementation to the AI parser pipeline.

**Verification:**
- Spec grew 2,636 → 2,945 lines (+309).
- All cross-references resolve: ADR-0021, ADR-0025, this design spec, `evaluationEngine.ts` Step 6c, `plotEquity3CapEngine.test.ts`.
- Engine math already locked by Phase 2's lock test (19 tests covering gold-standard + variant + negative cases). Spec is downstream documentation; no new test added.

### Phase 4 — UI + PDF ✅ closed 2026-06-02

Shipped in one session. Two parts:

**Part A — Offer card UI** ([`LenderPlotEquityBreakdown.svelte`](../../src/lib/components/dashboard/results/LenderPlotEquityBreakdown.svelte)):

- New component models the existing `LenderTrancheBreakdown.svelte` pattern (sibling block, styled grid, presence-checked render).
- Mounts in [`LenderResultCard.svelte`](../../src/lib/components/dashboard/results/LenderResultCard.svelte) between the metrics row and `AffordabilityBreakdown`.
- Presence-check on all four `plot_equity_*` fields IS the variant gate — engine guarantees the four land together or not at all, so no separate `loanVariant` prop plumbing was needed.
- **Additive layout**: standard Amount/ROI/EMI/Tenure metrics row stays unchanged; breakdown appears BELOW (lowest regression risk; matches the spec's "ships ADDITIVELY" framing).
- 4-card grid showing Sanctioned / Seller payment / Buyer cash / Buyer net cash needed with semantic recipient tags ("Headline" / "To seller" / "To buyer" / "Out of pocket") and per-card notes.
- "Unused sanction" sub-note when `seller + buyer cash < sanction` (combined-cap explanation).
- Buyer-margin-on-registered sub-note deferred (would require surfacing `marketValue` + `registryValue` as 2 new top-level fields on `LenderResult`; chipped as a small follow-up).

**Part B — File-builder PDF**:

- New `lender_offer` section added to all 3 default section lists in [`fileConfigurator.ts`](../../src/lib/server/fileConfigurator.ts) (`SECURED_SECTIONS` / `UNSECURED_SECTIONS` / `PERSONAL_LOAN_SECTIONS`) + `SECTION_LABELS`.
- `buildFilePayload` signature gains an optional `lenderResult?: LenderResult` parameter.
- New `buildLenderOfferSection` helper renders standard fields (Lender / Sanction Amount / Interest Rate (ROI) / Monthly EMI / Tenure (months)) for every loan type; nests a "Plot & Equity Breakdown" sub-object (Sanction Headline / Seller Payment / Buyer Cash / Buyer Net Cash Needed) when the four `plot_equity_*` fields are populated.
- File-builder API GET + POST endpoints ([`+server.ts`](../../src/routes/api/cases/%5Bcase_id%5D/file-builder/+server.ts)) load the latest `LenderResultsSnapshot` via new `findLenderResultForApplication` helper and pass the matching result to `buildFilePayload`. Fault-tolerant: if no snapshot exists (case never evaluated) or this lender isn't in the latest results, `lender_offer` simply doesn't render — graceful degradation.
- Existing generic `renderValue` PDF rendering handles the nested object structure — no custom PDF rendering needed.
- DSA can hide the section via `sections_visibility.lender_offer = false` (existing FileConfig pattern, no schema change).

**Verification:**

- Lock test [`fileBuilderLenderOffer.test.ts`](../../src/lib/testing/__tests__/fileBuilderLenderOffer.test.ts) covers all 5 expected behaviors (no-section-when-no-result / standard-fields-when-no-Equity-breakdown / 4-number-breakdown-when-fields-present / section-hidden-via-visibility-config / non-Equity-Plot-Loan-renders-standard-fields-only).
- Engine math already locked by Phase 2's [`plotEquity3CapEngine.test.ts`](../../src/lib/testing/__tests__/ruleEngine/plotEquity3CapEngine.test.ts) (19 tests). Phase 4 is the presentation layer; the section helper has the values verified at the engine.
- Type-check 0 errors / 0 warnings on changed files. Tests 12,939 → 12,944 (+5 from new lock test).

**Manual verification gap (explicit):** the offer-card and PDF surfaces require a real Plot & Equity Loan case with a lender whose rule doc supplies all three caps (X/Y/Z). No such fixture exists in dev today — PMS team's per-lender percentage work hasn't started. The wiring is statically verified (type-check + lock test); the visible rendering will be confirmed when the first Plot & Equity lender is onboarded in PMS.

**What was DELIBERATELY NOT changed:**

- Standard 4-metric row on offer card stays. Spec hint of "swap to 4-number breakdown" deferred to a future design pass — the additive shipping path avoids any regression on Home/LAP/Personal/Business offers.
- `LenderResult` not extended with `marketValue` / `registryValue` input fields. The breakdown component renders without them; "buyer's margin on registered portion" sub-note (spec §5 Phase 4) is the follow-up that needs those exposures.
- No per-loan-type variant in the PDF section helper — all loans get the same standard 5 lines; only Plot & Equity adds the nested breakdown. Simpler than per-loan-type customization.

---

## 6. Per-lender variation

The three percentages (X / Y / Z — example values 70 / 90 / 40 in this spec) are LENDER-SPECIFIC. Owner does NOT have HDFC's or Axis's actual published numbers in hand as of 2026-05-29.

**Once Phase 1-3 ship**, PMS team sources real per-lender percentages from policy docs. Until then this spec uses the worked example as the gold-standard test fixture — the implementation must produce ₹18L seller / ₹40L buyer / ₹58L disbursed / ₹42L buyer net when fed the example inputs and X=70 / Y=90 / Z=40.

---

## 7. Sequencing and dependencies

**Do NOT start before:**
- The Professional Loan no-offers hotfix (Pitfall #67) is committed and shipped. Independent surface, but uses the same enricher file — finish that first.
- RM questionnaire Pass 2 has decided how multi-dimensional fields (FOIR slabs, ROI matrices, etc.) are represented. Plot & Equity's three caps may benefit from the same matrix-input pattern Pass 2 designs.

**Can run in parallel with:**
- ITR-first income redesign (different surface, no shared files).
- Applicant-selection heuristic cleanup (Pitfall #67 follow-up).

**Blocking on:**
- Owner sourcing HDFC + Axis published percentages (or accepting the example fixture as the only test until PMS does the per-lender pass post-Phase-3).

---

## 8. Decisions deferred to implementation

- **Exact form question wording** for "market value" vs "registry value" (DSA-facing language matters; capture with i18n keys).
- **Whether marketValue is operator-entered or DSA-derived from comparable sales** (Phase 1b assumes operator-entered with an optional "suggestion" path mirroring the existing ATSvalue question pattern).
- **Whether buyer's margin on registered portion is shown as a separate line or rolled into "Buyer net cash needed"** (UI/UX call — Phase 4).
- **How to handle the case where market value < registry value** (rare but real — defensive zero / negative clamps; spec out in Phase 2).

---

## 9. Construction Only / Plot+Construction is structurally different (do not conflate)

These are **staged disbursement against construction milestones** — payment tranches released as foundation / walls / finishing complete and contractor bills submitted. Different rule shape entirely. They are out of scope for THIS spec; their own design spec is future work if not already covered by existing engine logic.

---

## 10. References

- Memory: `reference_plot_equity_loan_mechanics.md` — plain-English domain understanding
- Memory: `reference_plot_loan_field_naming.md` — `loanType` vs `PlotLoanActivity` overload
- Codebase: `src/lib/config/plotLoan/questionBank/loanRequirement.ts` (existing Plot & Equity form questions)
- Codebase: `src/lib/utils/payloadBuilder/loanTransaction.ts:64-90` (variant + BT field handling)
- Codebase: `src/lib/config/lenderPolicies/types.ts` (LoanProduct enum, where new rule sections will be added)
- Codebase: `src/lib/config/pms/policySpec/LOAN_POLICY_PARSER_SPEC_V7.md` (parser spec target)
- CHANGELOG entry (around 2026-04) — prior deferral context
- Pitfall #33 (`docs/PITFALLS.md`) — field-name overload, needs review during Phase 1a
