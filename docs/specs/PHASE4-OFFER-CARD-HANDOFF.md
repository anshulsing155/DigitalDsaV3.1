# Phase 4: Offer Card Updates — Complete Handoff Document

> **Purpose**: Everything needed to implement Phase 4 in a new session without re-exploration.
> **Created**: 2026-02-24, after completing Phases 1-3 (committed as `68b86e42`).

---

## 1. WHAT PHASE 4 IS

Phase 4 adds 4 features to lender offer/result cards (the cards DSAs see after form evaluation):

| #   | Feature                      | Spec Lines         | Summary                                                     |
| --- | ---------------------------- | ------------------ | ----------------------------------------------------------- |
| 19  | Tranche display              | 1232–1248, 146–173 | Show home loan tranche vs additional tranche breakdown      |
| 20  | NRI GPA policy               | 1249–1254          | Per-lender "who can be GPA" message when ALL applicants NRI |
| 21  | Registry timeline urgency    | 649–685, 1255–1260 | URGENT badge when registry < 1 month                        |
| 22  | BT market value appreciation | 174–179, 883–898   | Appreciation % signal for BT cases                          |

**Spec file**: `docs/HOME-LOAN-FORM-REDESIGN-SPEC.md` (single source of truth)

---

## 2. CURRENT ARCHITECTURE (as explored 2026-02-24)

### 2.1 Data Flow

```
Form answers → LoanApplicationPayload (payloadBuilder)
    → payloadEnricher (adds computed fields)
    → evaluationEngine (per-lender evaluation)
    → LenderEvaluation[] (intermediate results)
    → resultBuilder (assembles final output)
    → LenderResult[] (displayed to DSA)
    → LenderResultCard.svelte (UI component)
```

### 2.2 Key Types

**`LenderResult`** (`src/lib/types/lenderResults.ts`):

```typescript
{
  lender_application_id, lender_name,
  traffic_light: 'green' | 'amber' | 'red' | 'grey',
  traffic_light_message: string,
  eligible_amount, ltv_capped_amount?, offered_amount,
  roi, emi, tenure_months, processing_fee_percent?,
  rating: MetricRating,
  metric_ratings: { amount, roi, emi, tenure },
  factors: DecisionFactor[],
  suggestions: ImprovementSuggestion[],
  corporate_dsas: CorporateDsaRec[],
  rm_contact?: { rm_name, phone?, whatsapp?, designation? },
  key_metrics: { foir?, ltv?, net_income, cibil, approval_probability },
  discomfort?: DiscomfortAnalysis,
  computed_at: string
}
```

**`LenderEvaluation`** (`src/lib/ruleEngine/types.ts`):

```typescript
{
  lender_id, lender_name, classification,
  gate_results: GateResult[], all_gates_passed, failed_gate_ids,
  assessed_income, income_sources, obligation_load_monthly, obligation_details,
  foir, max_foir, foir_eligible_amount,
  ltv?, max_ltv?, ltv_capped_amount?,
  roi, tenure_months, processing_fee_percent?,
  eligible_amount, offered_amount, emi,
  deviations_applied: AppliedDeviation[],
  traffic_light, traffic_light_message, approval_probability,
  policies: ParsedPolicy[]
}
```

**`ParsedPolicy`** (`src/lib/ruleEngine/types.ts`):

```typescript
{
  policy_key: string,
  label: string,
  value: string | number | boolean | string[],
  display_on_offer_card: boolean,
  category: string
}
```

**`LoanTransactionPayload`** (already has these fields from V2 schema):

- `marketValue?: number` — current market value (all cases)
- `registryValue?: number` — registry/agreement value (New Loan only)
- `currentPropertyValue?: number` — existing property value (BT cases)
- `registryTimeline?: string` — WITHIN_1_MONTH / 1_3_MONTHS / 3_6_MONTHS / SPECIFIC_DATE
- `propertyCost?: number` — deal value
- `propertyIdentified?: boolean`

### 2.3 Evaluation Engine — Parameter Extraction Pattern

In `src/lib/ruleEngine/evaluationEngine.ts` (line ~172):

```typescript
function extractParameters(enrichedPayload, ruleDoc) → ExtractedParameters
```

The `ExtractedParameters` interface (line ~148) currently has:

- `maxLtv: number | undefined`
- Other params (tenure, roi, foir, etc.)

Extraction pattern (line ~221):

```typescript
} else if (key === 'max_ltv' && typeof value === 'number') {
    params.maxLtv = value;
}
```

LTV computation (line ~414-420):

```typescript
const propertyCost = payload.loanTransaction.propertyCost ?? 0;
// ... atsValue logic ...
ltvCappedAmount = calculateLtvCappedAmount(params.maxLtv, propertyCost, atsValue);
```

**To add `max_lcr`**: Mirror this exact pattern — add to ExtractedParameters, add extraction case, compute `lcr_capped_amount = registryValue * maxLcr`.

### 2.4 Result Builder Functions

In `src/lib/ruleEngine/resultBuilder.ts`:

| Function                                          | Line | What it does                                               |
| ------------------------------------------------- | ---- | ---------------------------------------------------------- |
| `buildFactors(evaluation)`                        | 109  | Creates DecisionFactor[] from gates + metrics              |
| `buildSuggestions(evaluation, payload)`           | 200  | Creates improvement suggestions                            |
| `assignRatings(evaluations)`                      | 312  | Percentile-based ratings across lenders                    |
| `calculateApprovalProbability(evaluation)`        | 398  | Returns 0-1 probability                                    |
| `buildTrafficLightMessage(evaluation)`            | 450  | Human-readable status                                      |
| `buildLenderResult(evaluation, ratings, payload)` | 495  | **Main assembler** — calls all above, returns LenderResult |
| `buildSummary(results, payload)`                  | 593  | Page-level summary stats                                   |

The `buildLenderResult` function at line 546-583 assembles the final return object. Phase 4 additions go here.

### 2.5 Rule Document Structure

**7 real bank docs** in `src/lib/ruleEngine/realBankRuleDocs.ts`:

- `HDFC_BANK` (line 175)
- `ICICI_BANK` (line 451)
- `AXIS_BANK` (line 755)
- `SBI_BANK` (line 1031)
- `BAJAJ_HOUSING` (line 1322)
- `TATA_CAPITAL` (line 1598)
- `LIC_HFL` (line 1889)
- `ALL_REAL_BANK_RULE_DOCS` (line 2180)

**3 sample docs** in `src/lib/ruleEngine/sampleRuleDocs.ts`:

- `SAMPLE_PVT_BANK` (line 61)
- `SAMPLE_GOV_BANK` (line 413)
- `SAMPLE_NBFC` (line 708)
- `ALL_SAMPLE_RULE_DOCS` (line 1057)

Each has `sections.ltv` (array of `ParsedRule[]`) and `policies` (array of `ParsedPolicy[]`).

### 2.6 LenderResultCard Component

**File**: `src/lib/components/dashboard/results/LenderResultCard.svelte` (892 lines)

Structure:

1. **Card Header** (lines 124-187) — rank, lender name, traffic dot, badges, selection button
2. **Red Card Collapsed** (lines 192-198) — just reason + expand button
3. **Metrics Row** (lines 203-253) — 4-column grid: Amount, ROI, EMI, Tenure
4. **Key Metrics Bar** (lines 258-292) — compact: FOIR, LTV, CIBIL, Approval %, Fee
5. **Expandable Sections** (lines 297-343) — Factors, Suggestions, DSA Channels
6. **CTA Row** (lines 348-385) — RM contact links + "Prepare File" button

**Badge system** (lines 90-99): `badges` is a `$derived.by()` that builds an array of `{ text, class }` objects. Easy to extend.

**Mobile responsive**: At 640px breakpoint, metrics grid switches from 4-col to 2-col.

### 2.7 Results Page

**File**: `src/routes/dashboard/dsa/cases/[case_id]/results/+page.svelte`

Renders `<LenderResultCard>` for each result. Has sort/filter logic, version timeline, cross-sell banner.

---

## 3. SPEC REQUIREMENTS (Exact Text)

### 3.1 Tranche Display (Spec lines 146-173, 1232-1248)

> Every lender's offer card MUST show:
>
> - **Home Loan tranche** — Amount based on LCR (Registry Value × LTV%)
> - **Home Loan interest rate** — Rate for the documented home loan
> - **Additional tranche** — Remaining amount (LTTV sanction − LCR loan)
> - **Additional tranche category** — Furniture & Fixing / Renovation / etc.
> - **Additional tranche rate** — Same or slightly higher than home loan rate
> - **Disbursement timing** — Which tranches before registry, which after
> - **Post-registry gap** — Amount released after registry (the deal-breaker amount)
> - **Mitigation guidance** — If post-registry gap exists: "Buyer may arrange cheque from spouse/family member for ₹X until lender releases funds post-registration"

**The Deal-Breaker Problem** (spec lines 161-173):

> Seller wants ALL money before signing at registrar office.
> But additional tranche releases AFTER registry.
> This breaks many deals.
>
> MIDDLE ROUTE (practical mitigation):
> Buyer provides a cheque (preferably from spouse/family)
> for the post-registry tranche amount, to the seller.
> Once lender releases funds, cheque is returned/cancelled.
> DSA must inform lender when such arrangement is planned.

**Key formulas** (from spec Section 2):

- Home Loan tranche = registryValue × LCR%
- Additional tranche = (marketValue × LTTV%) − Home Loan tranche
- LCR = Loan / Registry Value (documented value, up to 90%)
- LTTV = Loan / Market Value (RBI rules, sanctionable amount)

**When tranche applies**: New Loan + propertyIdentified=Yes + registryValue > 0 + **registryValue < propertyCost** (deal value). If registryValue equals propertyCost, the entire deal is registered at face value — no under-registration, no tranche split, no post-registry gap. NOT for pre-sanction (no property). BT has a different structure (BT amount + optional top-up, not registry-based tranches).

**Field name mapping** (schema → payload):

- `propCost` → `propertyCost` (deal value)
- `registryValue` → `registryValue` (registration value)
- `marketValue` → `marketValue` (market value)

### 3.2 NRI GPA Policy (Spec lines 1249-1254)

> When ALL applicants are NRI, each offer card shows:
>
> - "As per [Lender Name]'s policy, [relationship types] are eligible as GPA"
> - This is per-lender config, NOT a form question

**Domain rule** (from memory): "GPA questions only when ALL applicants are NRI"

### 3.3 Registry Timeline Urgency (Spec lines 1255-1260)

> Based on `registryTimeline`:
>
> - If < 1 month: show "URGENT — fast processing required" badge
> - Sort/prioritize lenders with faster documented turnaround times

### 3.4 BT Market Value Appreciation (Spec lines 174-179, 1501-1504)

> FOR BT CASES:
> Lenders want 6-12 months of appreciation
> (current market value > original market value at purchase)
> Higher appreciation = higher sanctionable amount for BT + Top-up.

> Every BT case gives us: property area, original disbursement year, current market value.

**Available data**: `marketValue` (current) and `currentPropertyValue` (from BT form page). If `currentPropertyValue` not provided, appreciation signal is unavailable.

---

## 4. IMPLEMENTATION PLAN (8 Steps)

### Step 1: Add Tranche + Appreciation Types

**File**: `src/lib/types/lenderResults.ts`

Add these interfaces:

```typescript
/** Single tranche in a loan disbursement structure */
export interface LoanTranche {
	category: string; // 'home_loan' | 'furniture_fixing' | 'renovation' | 'bt_amount' | 'top_up'
	label: string; // "Home Loan", "Furniture & Fixing", etc.
	amount: number;
	roi: number; // annual %
	timing: 'before_registry' | 'at_registry' | 'after_registry';
	timing_label: string; // "Released before/at registry"
}

/** Complete tranche breakdown */
export interface TrancheBreakdown {
	structure_type: 'new_loan' | 'balance_transfer';
	tranches: LoanTranche[];
	total_sanctioned: number;
	post_registry_gap: number; // amount released AFTER registry
	mitigation_guidance?: string; // when post_registry_gap > 0
}

/** BT appreciation signal */
export interface BTAppreciationSignal {
	current_market_value: number;
	reference_value: number;
	appreciation_percent: number;
	label: string;
	strength: 'strong' | 'moderate' | 'weak' | 'negative';
}
```

Extend `LenderResult`:

```typescript
tranche_breakdown?: TrancheBreakdown;
nri_gpa_policy?: string;
registry_urgency?: 'urgent' | 'normal';
bt_appreciation?: BTAppreciationSignal;
```

### Step 2: Add `max_lcr` to Evaluation Pipeline

**File**: `src/lib/ruleEngine/types.ts`

- Add to `LenderEvaluation`: `max_lcr?: number` and `lcr_capped_amount?: number`

**File**: `src/lib/ruleEngine/evaluationEngine.ts`

- Add `maxLcr: number | undefined` to `ExtractedParameters` (near line 150)
- Add extraction: `} else if (key === 'max_lcr' && typeof value === 'number') { params.maxLcr = value; }` (near line 221)
- After LTV block (line ~416), compute LCR:
  ```typescript
  const registryValue = payload.loanTransaction.registryValue ?? 0;
  const maxLcr = rawParams.maxLcr !== undefined ? rawParams.maxLcr : (rawParams.maxLtv ?? 0);
  let lcrCappedAmount: number | undefined;
  if (secured && registryValue > 0 && maxLcr > 0) {
  	lcrCappedAmount = Math.round(registryValue * (maxLcr / 100));
  }
  ```
- Pass to evaluation assembly: `max_lcr: maxLcr ? maxLcr / 100 : undefined, lcr_capped_amount: lcrCappedAmount`

### Step 3: Build Phase 4 Data in Result Builder

**File**: `src/lib/ruleEngine/resultBuilder.ts`

Add 4 functions (before `buildLenderResult`):

1. `buildTrancheBreakdown(evaluation, payload)` → `TrancheBreakdown | undefined`
   - Guard: only New Loan + propertyIdentified + registryValue > 0 + registryValue < propertyCost + offeredAmount > 0
   - Home Loan tranche = min(offeredAmount, lcr_capped_amount ?? offeredAmount)
   - Additional tranche = offeredAmount − home loan tranche
   - Generate mitigation text when post_registry_gap > 0

2. `extractNriGpaPolicy(evaluation, payload)` → `string | undefined`
   - Guard: ALL applicants `isNRI === true`
   - Find `nri_gpa_eligible_relationships` in evaluation.policies
   - Return formatted string

3. `determineRegistryUrgency(payload)` → `'urgent' | 'normal' | undefined`
   - WITHIN_1_MONTH → 'urgent', anything else → 'normal', no answer → undefined

4. `buildBTAppreciation(payload)` → `BTAppreciationSignal | undefined`
   - Guard: BT/top-up loan type + marketValue > 0 + currentPropertyValue > 0
   - Compute appreciation_percent and strength tier

Wire into `buildLenderResult()` return object (line ~546).

### Step 4: Add Rule Doc Data

**Files**: `src/lib/ruleEngine/realBankRuleDocs.ts` + `sampleRuleDocs.ts`

For all 10 bank docs:

1. Add `max_lcr` parameter rule to `sections.ltv[]`:

```typescript
{
    rule_id: '[bank-id]-max-lcr',
    description: 'Maximum LCR (Loan to Registry Value)',
    tier: 'parameter' as const,
    logic: { '!!': [true] },
    parameter_key: 'max_lcr',
    parameter_value: 90,  // varies per bank: 80-90
    confidence: 0.85,
    source_excerpt: 'LCR up to 90%'
}
```

2. Add NRI GPA policy to `policies[]`:

```typescript
{
    policy_key: 'nri_gpa_eligible_relationships',
    label: 'Eligible GPA Relationships',
    value: ['Parents', 'Spouse', 'Siblings', 'Children'],  // per-lender
    display_on_offer_card: true,
    category: 'nri'
}
```

### Step 5: Update LenderResultCard UI

**File**: `src/lib/components/dashboard/results/LenderResultCard.svelte`

**5a. URGENT badge** (in `badges` computed, line ~90):

```typescript
if (result.registry_urgency === 'urgent') {
	list.push({ text: 'URGENT', class: 'badge-urgent' });
}
```

**5b. Tranche section** (after metrics row, before key-metrics bar ~line 253):

- Conditional on `result.tranche_breakdown`
- Two-column grid: each tranche shows label, amount (formatINR), rate, timing badge
- Warning box when post_registry_gap > 0 with amber background + mitigation text

**5c. NRI GPA banner** (after key-metrics bar, before expand-sections):

- Single-line info banner with blue-ish background
- Text: `result.nri_gpa_policy`

**5d. BT appreciation indicator** (in key-metrics bar):

- Small colored span showing appreciation % and direction
- Color: emerald for strong, amber for moderate, stone for weak, red for negative

**CSS additions**:

- `.badge-urgent` — red background with subtle pulse animation
- `.tranche-section` — bordered container with header
- `.tranche-grid` — 2-column grid (1-column on mobile)
- `.tranche-item` — label, amount, rate, timing within each cell
- `.tranche-warning` — amber background box with icon
- `.nri-gpa-banner` — blue info bar
- `.bt-appreciation` — inline metric in key-metrics row

### Step 6: Optional — Urgency Sort in Results Page

**File**: `src/routes/dashboard/dsa/cases/[case_id]/results/+page.svelte`

If turnaround data exists in rule docs, add secondary sort by processing speed when registry_urgency is 'urgent'. Otherwise defer to a future PR.

### Step 7: Add Tests

**File**: `src/lib/testing/__tests__/offerCardPhase4.test.ts` (new)

10 test cases:

1. Tranche: registryValue=50L, marketValue=70L, offered=55L, max_lcr=0.9 → home=45L, additional=10L
2. Tranche absent for BT
3. Tranche absent for pre-sanction (propertyIdentified=false)
4. Post-registry gap + mitigation text
5. NRI GPA: all NRI + policy → formatted string
6. NRI GPA: mixed → undefined
7. Urgency: WITHIN_1_MONTH → 'urgent'
8. Urgency: 3_6_MONTHS → 'normal'
9. BT appreciation: 80L vs 60L → 33%, 'strong'
10. BT appreciation: missing currentPropertyValue → undefined

### Step 8: Validate

- `pnpm run check` → 0 errors, 0 warnings
- `pnpm run test:unit` → all pass (currently 6,991 + new tests)

---

## 5. DESIGN DECISIONS & RATIONALE

| Decision                                    | Rationale                                                   |
| ------------------------------------------- | ----------------------------------------------------------- |
| Tranche as nested `TrancheBreakdown` object | Cleaner than 10+ flat fields; conditional rendering natural |
| LCR defaults to LTV when `max_lcr` absent   | No regression risk; data is optional                        |
| NRI GPA from existing `policies[]` array    | No new type infrastructure; spec says "per-lender config"   |
| Additional tranche rate = roi + 0.25%       | Conservative estimate; refineable later via rule doc param  |
| BT appreciation uses `currentPropertyValue` | Best-effort; undefined when field missing (no crash)        |
| URGENT badge in existing badge system       | Consistent UX; no new patterns                              |

---

## 6. PITFALLS & WARNINGS

1. **Never use `propertyCost` for LCR** — use `registryValue` (different concept). `propertyCost` is the deal/agreement value (schema key: `propCost`). `registryValue` is what gets registered. These are only different when there's under-registration — **if equal, no tranche split is needed**.

2. **`evaluation.policies` already flows through** — `ParsedPolicy[]` is on `LenderEvaluation` (line 197 of types.ts), populated by the engine. No need to re-query rule docs in resultBuilder.

3. **`isNRI` on payload applicants** — check `payload.allApplicantDetails[x].isNRI` (boolean). Set by `src/lib/utils/payloadBuilder/applicantPayload.ts`.

4. **Don't break existing tests** — The 6,991 tests don't currently test result builder output for these fields (they're new optionals). But existing `formEngineSafety.test.ts` does call `createFormEngine` and `evaluatePage`, so any type errors in the engine would surface.

5. **Rule doc edits are large** — `realBankRuleDocs.ts` is 2200+ lines. Use targeted Edit tool additions to each bank's `ltv` section and `policies` array. Don't rewrite the file.

6. **Import new types** — `resultBuilder.ts` imports from `'$lib/types/lenderResults.js'`. After adding new interfaces, ensure they're imported: `LoanTranche, TrancheBreakdown, BTAppreciationSignal`.

7. **`calculateLtvCappedAmount` exists** in `src/lib/ruleEngine/emiCalculator.ts` — for LCR you can use the same function or compute inline (`registryValue * maxLcr`). The existing function handles some edge cases (ATS value comparison) that aren't relevant to LCR.

---

## 7. FILE PATH QUICK REFERENCE

| File                                                               | Purpose                                                               |
| ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `src/lib/types/lenderResults.ts`                                   | LenderResult, DecisionFactor, DiscomfortAnalysis types                |
| `src/lib/ruleEngine/types.ts`                                      | LenderEvaluation, ParsedPolicy, GateResult internal types             |
| `src/lib/ruleEngine/evaluationEngine.ts`                           | Main evaluation loop, parameter extraction, LTV/FOIR computation      |
| `src/lib/ruleEngine/resultBuilder.ts`                              | Converts evaluation → LenderResult for display                        |
| `src/lib/ruleEngine/realBankRuleDocs.ts`                           | 7 real bank rule documents (HDFC, ICICI, AXIS, SBI, BAJAJ, TATA, LIC) |
| `src/lib/ruleEngine/sampleRuleDocs.ts`                             | 3 sample rule documents (PVT, GOV, NBFC)                              |
| `src/lib/ruleEngine/systemConfig.ts`                               | Centralized constants (ratings, thresholds, penalties)                |
| `src/lib/ruleEngine/discomfortAnalyzer.ts`                         | Discomfort zone analysis                                              |
| `src/lib/ruleEngine/emiCalculator.ts`                              | EMI/LTV/FOIR calculation utilities                                    |
| `src/lib/components/dashboard/results/LenderResultCard.svelte`     | Offer card UI component (892 lines)                                   |
| `src/lib/components/dashboard/results/DecisionFactorsPanel.svelte` | Factors expandable section                                            |
| `src/lib/components/dashboard/results/ImprovementTips.svelte`      | Suggestions expandable section                                        |
| `src/lib/components/dashboard/results/ResultsSummaryBar.svelte`    | Results page header summary                                           |
| `src/routes/dashboard/dsa/cases/[case_id]/results/+page.svelte`    | Results page (renders cards)                                          |
| `src/lib/utils/payloadBuilder/types.ts`                            | LoanApplicationPayload, LoanTransactionPayload types                  |
| `src/lib/schemas/gpaProfile.schema.ts`                             | GPA profile Zod schema (name, age, relationship, CIBIL)               |
| `docs/HOME-LOAN-FORM-REDESIGN-SPEC.md`                             | Spec (single source of truth)                                         |

---

## 8. VERIFICATION CHECKLIST

After implementation:

- [ ] `pnpm run check` → 0 errors, 0 warnings
- [ ] `pnpm run test:unit` → all pass (6,991 existing + ~10 new)
- [ ] New `LenderResult` fields are all optional (no breaking changes)
- [ ] Tranche only shows for New Loan + identified property + registryValue > 0 + registryValue < propertyCost
- [ ] NRI GPA only shows when ALL applicants are NRI
- [ ] URGENT badge only for WITHIN_1_MONTH
- [ ] BT appreciation only for BT/top-up loan types with both values present
- [ ] No changes to existing LenderResultCard layout for non-home-loan results
- [ ] Mobile responsive: tranche section works at 640px breakpoint
