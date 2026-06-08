# Obligation Capture Redesign — Specification

> **Created**: 2026-04-04 | **Status**: SPEC (not yet implemented)
> **Replaces**: Abstract `loanCapacity` field (individual/as_director/as_partner/as_proprietor)
> **Motivation**: Current system doesn't capture who's actually on each loan or how EMIs are split. DSAs know this from sanction letters and CIBIL — the system should capture that directly.

---

## 1. DESIGN PRINCIPLES

| # | Principle | Rationale |
|---|-----------|-----------|
| 1 | **Capture reality, not abstractions** | DSAs see sanction letters with names, not "capacity" labels. Capture what's on the document. |
| 2 | **CIBIL is the source of truth** | Every active obligation shows on CIBIL. The system should match what CIBIL shows. |
| 3 | **Co-borrowers are jointly liable for 100%** | Indian law: joint and several liability. Default to 100% per person, let bank policy relax. |
| 4 | **Facility type drives the form** | Term loans have EMIs. OD/CC have limits and utilization. Don't force the same fields on both. |
| 5 | **Evidence over assumption** | If the DSA has a sanction letter or bank statement, trust the specifics. If not, use conservative defaults. |
| 6 | **Per-bank rules live in policy engine** | FOIR thresholds, OD/CC factors, guarantor loading — these vary by lender and belong in PolicyRules, not hardcoded. |

---

## 2. FACILITY TYPES

Replace the current implicit derivation from loan type string with explicit facility classification:

| Facility Type | Key | Who Gets It | Monthly Obligation Calculation |
|---|---|---|---|
| **Term Loan** | `term_loan` | Individuals, Companies | Fixed EMI (from sanction letter or CIBIL) |
| **Overdraft (OD)** | `od` | Companies (against inventory/receivables), Individuals (against property/FD) | Bank-specific factor × sanctioned limit (default 5%) |
| **Cash Credit (CC)** | `cc` | Companies only (against stock/receivables) | Bank-specific factor × sanctioned limit (default 5%) |
| **Dropline OD** | `dropline_od` | Companies, Individuals (against property) | Dropline reduction amount (like EMI) OR interest on utilized |
| **Credit Card** | `credit_card` | Individuals, Companies | 5% of total outstanding (industry standard minimum due proxy) |

### OD/CC Monthly Factor (Per-Bank)

No single RBI mandate. Banks use 3-5% of sanctioned limit as the conservative monthly factor:
- **Conservative**: 5% of sanctioned limit
- **Moderate**: 3% of sanctioned limit
- **Evidence-based**: Average monthly interest outflow from bank statements (6-12 months)

The rule engine should apply the factor from `PolicyRules`, defaulting to 5%.

---

## 3. NEW DATA MODEL

### 3.1 ObligationEntry (replaces EnhancedLoanEntry)

```typescript
interface ObligationEntry {
  id: string;                    // UUID

  // ── Facility Classification ──
  facilityType: FacilityType;    // 'term_loan' | 'od' | 'cc' | 'dropline_od' | 'credit_card'
  loanType: string;              // Specific type (Home Loan, Personal Loan, Working Capital OD, etc.)
  bankName: string;              // Lender name

  // ── Term Loan Fields (facilityType === 'term_loan') ──
  emi?: number;                  // Fixed monthly EMI
  tenure?: number;               // Total tenure in months
  remainingTenure?: number;      // Remaining months
  interestRate?: number;         // Annual rate %

  // ── OD/CC Fields (facilityType === 'od' | 'cc') ──
  sanctionedLimit?: number;      // Total sanctioned limit
  utilizedAmount?: number;       // Current utilization
  // Monthly obligation = bank-specific factor × sanctionedLimit (computed by rule engine)

  // ── Dropline OD Fields (facilityType === 'dropline_od') ──
  // Inherits sanctionedLimit + utilizedAmount from OD/CC
  droplineEmi?: number;          // Monthly limit reduction (the "dropline")
  sanctionedTenure?: number;     // Original tenure

  // ── Credit Card Fields (facilityType === 'credit_card') ──
  totalOutstanding?: number;     // Current total outstanding
  creditLimit?: number;          // Sanctioned credit limit
  // Monthly obligation = 5% of totalOutstanding (or bank-specific policy)

  // ── Who's On This Loan ──
  role: ObligationRole;                    // This applicant's role on the loan
  coBorrowers: CoBorrowerEntry[];          // All other people on this loan

  // ── EMI Responsibility ──
  emiResponsibility: 'full' | 'shared';    // Does this person bear the full obligation?
  monthlyShare?: number;                   // If shared: their actual monthly payment
  shareSource: 'default_100' | 'equal_split' | 'documented_split' | 'dsa_estimate';

  // ── Evidence ──
  evidence: ObligationEvidence;

  // ── Closure Plan ──
  selectedToClose: ClosurePlan;

  // ── EMI Payment Source ──
  emiPaidBy: EmiPaidBy;                    // Who actually pays the EMI
  emiPaymentMode?: string;                 // Direct debit / NEFT / UPI / business account

  // ── Metadata ──
  emiDelayHistory?: 'none' | '1_delay' | '2_plus_delays';
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 Co-Borrower Entry

```typescript
interface CoBorrowerEntry {
  name: string;                            // Full name of co-borrower/guarantor
  relationship: string;                    // Spouse, parent, business partner, etc.
  isInApplication: boolean;                // Is this person an applicant in the current case?
  applicantId?: string;                    // If in application: link to their applicant entry
  roleOnLoan: 'co_borrower' | 'guarantor'; // Their role on this specific loan
}
```

### 3.3 Obligation Role

```typescript
type ObligationRole =
  | 'primary_borrower'       // Main borrower — 100% liable
  | 'co_borrower'            // Joint borrower — jointly liable for 100%
  | 'guarantor'              // Guarantor — liable if borrower defaults
  | 'name_lender';           // Name on loan but not paying (e.g., spouse added for tax benefit)
```

### 3.4 Evidence

```typescript
interface ObligationEvidence {
  hasSanctionLetter: boolean;       // Original sanction letter available
  hasBankStatement: boolean;        // 6-12 month bank statement showing EMI debits
  matchesCibil: boolean;            // This obligation appears on CIBIL report
  hasForeClosureLetter?: boolean;   // If closing: foreclosure letter from bank
  hasNoc?: boolean;                 // If already closed: NOC from bank
}
```

### 3.5 Closure Plan

```typescript
type ClosurePlan =
  | 'keep_running'                  // Continue as-is
  | 'close_self_funded'             // Close before disbursement (own funds)
  | 'close_from_topup'             // Close from top-up/BT proceeds
  | 'not_my_liability';            // Guarantor/name lender — not actually paying
```

### 3.6 EMI Payment Source

```typescript
type EmiPaidBy =
  | 'self'                          // Applicant pays from own account
  | 'co_borrower'                  // Co-borrower pays
  | 'spouse'                       // Spouse pays (not a co-borrower)
  | 'business_account'             // Paid from company/firm account
  | 'other';                       // Other arrangement
```

---

## 4. RULE ENGINE INTEGRATION

### 4.1 Monthly Obligation Computation

For each obligation entry, the rule engine computes the **effective monthly obligation** for FOIR:

```
For term_loan:
  base = emi

For od / cc:
  base = sanctionedLimit × bankOdCcFactor  (default 5%)

For dropline_od:
  base = droplineEmi OR (sanctionedLimit × bankOdCcFactor)

For credit_card:
  base = totalOutstanding × bankCreditCardFactor  (default 5%)
```

### 4.2 Role-Based Loading

```
If role === 'primary_borrower' OR 'co_borrower':
  loading = 100%  (joint and several liability — Indian law default)

If role === 'guarantor':
  loading = bankGuarantorFactor  (0% / 50% / 100% per bank policy)

If role === 'name_lender':
  loading = 0%  (not paying, but shows on CIBIL)
```

### 4.3 Evidence-Based Override

If `shareSource === 'documented_split'` AND `evidence.hasBankStatement === true`:
- Use `monthlyShare` instead of `base × loading`
- This allows DSAs to prove that a co-borrower's actual payment is less than 100%

### 4.4 Per-Bank PolicyRule Parameters

These belong in the policy engine (per lender):

| Parameter | Default | Range | Description |
|---|---|---|---|
| `foirThreshold` | 50% | 40-70% | Maximum FOIR allowed |
| `odCcMonthlyFactor` | 5% | 3-5% | % of OD/CC limit as monthly obligation |
| `creditCardFactor` | 5% | 3-5% | % of CC outstanding as monthly obligation |
| `guarantorLoading` | 100% | 0/50/100% | How much of guaranteed loan counts |
| `coBorrowerSplitAllowed` | false | true/false | Whether evidence-based split is accepted |

---

## 5. UI DESIGN

### 5.1 Form Flow

**Step 1 — Facility & Lender**
- Facility type selector (term loan / OD / CC / dropline OD / credit card)
- Lender name (searchable dropdown)
- Loan type (filtered by facility type)

**Step 2 — Amount & Terms** (adapts by facility type)
- *Term loan*: EMI, tenure, rate, remaining tenure
- *OD/CC*: Sanctioned limit, utilized amount
- *Dropline OD*: Sanctioned limit, utilized, dropline EMI, tenure
- *Credit card*: Total outstanding, credit limit

**Step 3 — Who's On This Loan**
- Your role (primary / co-borrower / guarantor / name lender)
- Co-borrowers list: add name, relationship, whether they're in this application
- If in application: auto-link to their applicant card (dropdown)

**Step 4 — Your Share**
- If sole borrower: 100% (auto, no question needed)
- If co-borrower(s) exist:
  - "Do you have documentary proof of EMI split?" (yes/no)
  - If yes: enter your monthly share amount
  - If no: defaults to 100% (conservative, per Indian law)

**Step 5 — Evidence & Closure**
- Evidence checkboxes: sanction letter, bank statement, matches CIBIL
- Closure plan selector
- EMI payment source (who pays, from which account)
- EMI delay history

### 5.2 Table Display

| Facility | Lender | Type | Role | EMI/Limit | Your Share | Evidence | Closure |
|---|---|---|---|---|---|---|---|
| Term Loan | HDFC | Home Loan | Primary | ₹45,000 | ₹45,000 (100%) | CIBIL+SL | Keep |
| OD | SBI | Working Capital | Co-Borrower | ₹10L limit | ₹25,000 (5%) | BS | Keep |
| CC | ICICI | Credit Card | Primary | ₹2.4L out | ₹12,000 (5%) | CIBIL | Close |

---

## 6. MIGRATION PATH

### 6.1 Additive Changes

New fields are added alongside existing ones. No field removals in v1:

- `facilityType` added (derived from `loanType` string for existing entries)
- `coBorrowers[]` added (empty for existing entries)
- `evidence` added (all false for existing entries)
- `shareSource` added ('default_100' for existing entries)
- `loanCapacity` field kept but deprecated (not shown in new UI)

### 6.2 Backward Compatibility

Existing obligation data continues to work:
- `emi`, `totalLimit`, `tenure`, `interestRate` — unchanged
- `selectedToClose` — unchanged
- `loanRole` → maps to `role` (same values)
- `emiFromOwnAccount` + `emiPaidBy` → maps to new `emiPaidBy`

### 6.3 Auto-Classification

For existing entries without `facilityType`:
```
if loanType in ['OD Limit', 'Overdraft (OD)'] → 'od'
if loanType in ['CC Limit', 'Cash Credit (CC)'] → 'cc'
if loanType in ['Dropline OD'] → 'dropline_od'
if loanType contains 'Credit Card' → 'credit_card'
else → 'term_loan'
```

---

## 7. COMPANY vs PERSONAL OBLIGATIONS

With this redesign, the company/personal distinction is **naturally solved**:

- **Company obligations**: The Company applicant's obligation entries. Their linked directors appear as co-borrowers (with `isInApplication: true`, `applicantId` pointing to the director's Individual entry).
- **Director personal obligations**: The Individual (director) applicant's own entries. Their companies may appear as co-borrowers.
- **Personal guarantee**: Director has an obligation where `role === 'guarantor'` and the company is a co-borrower.

The rule engine can identify these patterns from the data without needing an explicit `obligationOwner` field.

---

## 8. DOCUMENTARY EVIDENCE HIERARCHY

For DSAs, the practical order of evidence reliability:

1. **CIBIL report** — Shows all active loans, EMIs, payment history, account type, ownership type. Gold standard.
2. **Bank statements (6-12 months)** — Validates actual EMI debits, OD/CC utilization patterns, payment regularity.
3. **Sanction letter** — Original terms: amount, rate, tenure, co-applicants, conditions.
4. **Loan account statement** — Current outstanding, rate, remaining tenure.
5. **NOC / Closure letter** — For loans claimed as closed but still on CIBIL.

The evidence flags help the rule engine decide how much to trust the DSA's input:
- `matchesCibil: true` + `hasBankStatement: true` → High confidence, accept documented splits
- `matchesCibil: true` only → Medium confidence, use CIBIL values
- Neither → Low confidence, use conservative defaults

---

## 9. FILES TO MODIFY (Implementation Phase)

| Priority | File | Change |
|---|---|---|
| 1 | `src/lib/types/incomeProfile.ts` | Add new types, keep EnhancedLoanEntry for backward compat |
| 2 | `src/lib/components/UnsecuredObligation.svelte` | Redesign form with facility-type-driven sections |
| 3 | `src/lib/components/ObligationTable.svelte` | New table layout with facility/evidence columns |
| 4 | `src/lib/config/incomeProfiles/obligationEnhancements.ts` | New option configs for roles, evidence, closure |
| 5 | `src/lib/utils/payloadBuilder/obligationPayload.ts` | Handle new fields, auto-classify facilityType |
| 6 | `src/lib/utils/payloadBuilder/types.ts` | Add new ObligationEntry fields |
| 7 | `src/lib/ruleEngine/payloadEnricher.ts` | Facility-aware monthly computation, evidence-based overrides |
| 8 | `src/lib/utils/obligationDedup.ts` | Update dedup to consider co-borrower links |
| 9 | `src/lib/ruleEngine/systemConfig.ts` | Default factors (odCcFactor, guarantorLoading, etc.) |

---

## 10. OPEN QUESTIONS

1. **Should co-borrower entries auto-create obligation mirrors?** If Raj lists "Priya" as co-borrower on a home loan, should Priya's obligation tab auto-show this loan? (Recommended: yes, as a read-only linked entry.)

2. **CIBIL auto-import**: Future integration could pre-fill obligations from CIBIL data. The evidence model is designed to support this — `matchesCibil` would be auto-set.

3. **Company CCR integration**: For company applicants, the Commercial Credit Report (CCR) shows company-level borrowings. Separate from individual CIR.
