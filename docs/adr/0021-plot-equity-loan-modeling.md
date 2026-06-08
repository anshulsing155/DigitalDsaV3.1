---
type: adr
epic: LEND-1
status: accepted
last_verified: 2026-06-02
related_specs: [PLOT-EQUITY-LOAN-DESIGN.md]
related_adrs: [ADR-0020, ADR-0025]
test_coverage:
  - src/lib/testing/__tests__/ruleEngine/plotEquity3CapEngine.test.ts
  - src/lib/testing/__tests__/plotEquityCanonicalFields.test.ts
owner: tech@digitaldsa.com
---

# ADR-0021 — Plot & Equity Loan as two-file purchase + LAP with 3-cap structure

**Status**: Accepted
**Date**: 2026-05-29 (Phase 1a/1b/1c shipped 2026-06-02 session S217 — see ADR-0025)
**Session**: field-nomenclature-audit (2026-05-29) + LEND-1 Phase 1 + 2 (2026-06-02)

## Context

"Plot & Equity Loan" is one of four variants the form offers under the Plot Loan umbrella (alongside Plot Loan Only, Plot & Construction Loan, Construction Loan Only). Prior to 2026-05-29 the engine had no specific logic for it, and a prior CHANGELOG entry around 2026-04 categorised it as "Plot & Equity refinance LTV cap — lender-policy gap, belongs in PMS rule documents per-lender."

That characterisation was wrong on two counts, surfaced by owner during 2026-05-29 audit:

1. **It is not a refinance / cash-out against an existing plot.** It is a fresh purchase transaction with an additional LAP component disbursed against the just-purchased plot as collateral. The buyer is buying a plot AND extracting equity from it in the same transaction. Two loan files are created at the lender (Plot Loan + LAP); both reference the same property.

2. **The "lender-policy gap" framing was incomplete.** Per-lender percentages ARE a PMS responsibility, but the engine has no SHAPE for the 3-layered cap that this product requires. PMS team has nowhere to put per-lender values until the engine schema gains the required rule sections.

The product exists in the Indian market and is offered by HDFC and Axis (and likely others). The form has plumbing for the variant (`PlotLoanActivity`, `loanType` variant value, `ATSvalue` / `agreementSellValue` / `propCost` / `mortgageYear` / `deposit` fields), but no clear field for **market value** distinct from **registry value** — a gap that needs closing before the engine logic can be implemented.

## Decision

Model Plot & Equity Loan in the engine as a **three-cap structure** acting at three points in the deal:

| Cap | Formula | Bounded by |
|---|---|---|
| Headline sanction | `X% × marketValue` | Overall lender commitment |
| Seller disbursement | `min(Y% × registryValue, sanction)` | Lower of registry-based limit AND sanction |
| Buyer cash disbursement (LAP) | `min(Z% × marketValue, sanction − seller portion)` | Lower of LAP-on-plot ceiling AND remaining sanction |

Per-lender percentages (X / Y / Z) are PMS team responsibility. The owner provided a worked example with X=70 / Y=90 / Z=40 on ₹1Cr market / ₹20L registry as the gold-standard test fixture until real per-lender percentages are sourced from HDFC and Axis policy docs.

Engine produces four numbers per Plot & Equity offer (instead of today's single sanction headline):
- Sanction headline (what the lender committed to)
- Seller payment (what goes to seller's account)
- Buyer cash component (what comes to buyer as cash from the LAP file)
- Buyer's net cash requirement (what the buyer must bring from own pocket)

Plus the margin requirement on the registered portion as a sub-figure (the day-one cash-at-closing).

Implementation is staged in four phases (full detail in spec):

- **Phase 1** — schema cleanup: add explicit `marketValue` / `registryValue` / derived `sellerCashComponent` fields; rename ambiguous fields. Absorbed by ADR-0020's nomenclature work.
- **Phase 2** — engine rule shape: three new sections in `policyTypes.ts` (`overallSanctionLtv`, `sellerDisbursementCap`, `lapOnPlotCap`) + the cap-layered calculation in `evaluationEngine.ts`
- **Phase 3** — parser spec + termDictionary updates so the AI policy parser can encode 3-cap rules from natural-language lender policies
- **Phase 4** — UI: offer card breakdown showing all four numbers; file-builder PDF mirror

Construction Only / Plot+Construction loans are explicitly out of scope for this ADR. They are structurally different (staged disbursement against milestone bills) and warrant their own modeling effort.

## Consequences

**Enables:**
- Accurate disbursement-reality numbers on Plot & Equity offer cards (DSAs and customers see what the buyer will actually receive, not just the headline sanction)
- Per-lender differential haircut and acceptance logic via the three independent rule sections
- The ₹42L buyer-net-out-of-pocket figure (the most important number for the DSA's customer conversation) becomes a first-class output
- Pattern that future complex multi-disbursement products can reuse (e.g., construction-completion-based disbursement)

**Prevents:**
- "Headline sanction = ₹70L" misleading the customer into expecting ₹70L when only ₹58L will actually disburse (₹12L "lost" to layered caps)
- The naive "Plot & Equity is just a different LTV" framing that the 2026-04 deferral encoded

**Accepts these trade-offs:**
- A multi-day engine + schema + UI implementation effort (7-10 working days estimated)
- Per-lender PMS work to fill the three percentages for the 9 existing lenders
- Sequencing dependency on ADR-0020 (Phase 1 schema cleanup) and RM Questionnaire Pass 2 (the matrix-input shape Pass 2 produces should inform how the three caps are captured)
- The worked example (X=70 / Y=90 / Z=40) drives the gold-standard test until PMS sources real numbers — real-world values may differ enough to force test adjustments

## Alternatives Considered

1. **Treat Plot & Equity as a generic LTV product** (the prior session's framing — "just hardcode 60% LTV"). Rejected because it ignores the buyer-cash-LAP component entirely; offer card would show wrong numbers for every Plot & Equity case.

2. **Two separate offer cards for the Plot file and the LAP file.** Rejected because operationally these are one transaction the customer sees as a single deal; surfacing them as two unrelated offers would confuse DSAs and customers and break the existing offer-card UI pattern.

3. **Defer until ITR-first income redesign** (owner-raised separately). Rejected because the two are independent — Plot & Equity is a rule-shape problem; ITR-first is an income-collection redesign. Both can proceed in parallel post-RM-Pass-2.

4. **Treat as Construction Loan with a separate cash-out step.** Rejected because Construction Loans have staged milestone disbursement against bills, completely different operational shape. The two products belong to different rule families.

## References

- Spec: [`docs/specs/PLOT-EQUITY-LOAN-DESIGN.md`](../specs/PLOT-EQUITY-LOAN-DESIGN.md) — 4-phase roadmap, codebase audit, per-lender variation notes
- Memory: `reference_plot_equity_loan_mechanics.md` — plain-English domain knowledge with ₹1Cr/₹20L gold-standard worked example
- Companion ADR: [ADR-0020](0020-loan-field-nomenclature.md) — Phase 1 schema cleanup is absorbed by the nomenclature rename
- Codebase: `src/lib/config/plotLoan/questionBank/loanRequirement.ts` — existing Plot & Equity form questions
- Codebase: `src/lib/ruleEngine/evaluationEngine.ts` — no current Plot & Equity logic (grep returns zero)
- Codebase: `src/lib/config/lenderPolicies/types.ts` — `LoanProduct` enum where new rule sections will land in Phase 2
- Prior framing (now superseded): `docs/CHANGELOG.md` around 2026-04 — "Plot & Equity LTV cap deferred as lender-policy gap"
- Live offerings: HDFC Plot & Equity Loan, Axis Plot & Equity Loan (per owner; product docs not yet sourced)
