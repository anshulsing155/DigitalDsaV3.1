# Obligations Page Flow Redesign
## Making Questions Logical & Natural Based on Running Loans Answer

**Status**: Implementation Plan
**Date**: 2026-02-25
**Goal**: Ensure each question paves the path for the next; hiding irrelevant questions when ObligationsRunning = "No"

---

## Current Flow Problems

### Problem 1: Obligations Question Always Appears
**Current**: CreditScoreSection shows obligations question to ALL applicants
**Issue**: For home loan applicants with no existing loans, this question is irrelevant
**Impact**: Creates confusion - "Do you have running loans?" for a new home loan customer

### Problem 2: EMI Delay History Shown for Credit Lines
**Current**: UnsecuredObligation shows "EMI delay history" for ALL loan types
**Issue**: Credit cards (CC Limit, OD Limit) don't have EMI delays - they have statement cycles
**Impact**: Confusing users with inapplicable terms

### Problem 3: Page Gates on Single Applicant Only
**Current**: obligationsPage only shows when `__applicantCount == 1`
**Issue**: Multi-applicant obligations are never collected
**Impact**: Co-applicant loan data is incomplete

### Problem 4: No Clear Path After "No" Answer
**Current**: When user answers "No" to running loans, entire section disappears
**Issue**: No confirmation, no next-step guidance
**Impact**: Users might wonder if they made a mistake

---

## Redesigned Logical Flow

### SCENARIO A: ObligationsRunning = "No"

```
┌─────────────────────────────────────────────────────────┐
│ CREDIT SCORE PAGE (CreditScoreSection)                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Q1: "What's your CIBIL Score?"                         │
│     [300-900, -1, or 0]                                 │
│     → Valid score? Continue to next questions           │
│                                                          │
│ Q2-Q4: Credit history graduated questions              │
│     • "Ever been defaulter/guarantor?"                  │
│     • "EMI bounces in last 12 months?"                  │
│     • "Credit enquiries in last 2 months?"              │
│     → All answered? Continue to Q5                      │
│                                                          │
│ Q5: "Any running loans or credit dues?"                │
│     [Yes / No]                                          │
│                                                          │
│  → Answer: NO ✓                                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
                         ↓
     ┌──────────────────────────────────┐
     │ SKIP OBLIGATIONS PAGE ENTIRELY   │
     │ • No table entry form shown      │
     │ • No "Add Loan" button           │
     │ • Continue to next section       │
     └──────────────────────────────────┘
```

**Implementation Details:**
- `showObligationsQuestion` remains at line 131-137
- Add **context prop**: `loanType` (Home Loan, Personal, etc.)
- Add **conditional**: Only show obligations Q for Personal/Professional/Business/DOD loans
- For Home Loan: Hide entire obligations question
- CSS: Add success indicator "✓ No existing obligations" before continuing

---

### SCENARIO B: ObligationsRunning = "Yes"

```
┌─────────────────────────────────────────────────────────┐
│ CREDIT SCORE PAGE (CreditScoreSection)                 │
├─────────────────────────────────────────────────────────┤
│ Q1-Q4: [As above]                                       │
│ Q5: "Any running loans or credit dues?"                │
│  → Answer: YES ✓                                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
                         ↓
     ┌──────────────────────────────────┐
     │ OBLIGATIONS PAGE                 │
     │ (obligationsPage schema, line     │
     │  1803 in homeLoanSchemaV2.json)  │
     └──────────────────────────────────┘
                         ↓
     ┌──────────────────────────────────┐
     │ UNSECURED OBLIGATION FORM        │
     │ (UnsecuredObligation.svelte)     │
     │                                  │
     │ Step 1: Loan Details             │
     │ ├─ Q: "Loan Type?"               │
     │ │   [Term Loan / CC Limit /      │
     │ │    OD Limit / Dropline OD]     │
     │ │   → Selected: Term Loan ✓      │
     │ │                                │
     │ ├─ Q: "Bank Name?"               │
     │ │   [90+ banks dropdown]         │
     │ │   → Selected: HDFC ✓           │
     │ │                                │
     │ ├─ Q: "EMI Amount?"              │
     │ │   [Only shown for term loans]  │
     │ │   → Enter 50,000 ✓            │
     │ │                                │
     │ ├─ Q: "Tenure (months)?"         │
     │ │   → Enter 60 ✓                 │
     │ │                                │
     │ ├─ Q: "Interest Rate (%)?"       │
     │ │   → Enter 8.5 ✓                │
     │ │                                │
     │ └─ Q: "EMI Delay History?"       │
     │    [HIDDEN if Credit Line]       │
     │    [Shown only for term loans]   │
     │    ["No delays" / "1 delay" /    │
     │     "2+ delays"]                 │
     │    → Select "No delays" ✓        │
     │                                  │
     │ Step 2: Your Liability           │
     │ ├─ Q: "Your role on loan?"       │
     │ │   [Primary / Co-Borrower /     │
     │ │    Guarantor / Name Lender]    │
     │ │   → Select "Primary" ✓         │
     │ │                                │
     │ ├─ Q: "Taken as? (Individual/    │
     │ │    Director/Partner/etc)"      │
     │ │   → Select based on role ✓     │
     │ │                                │
     │ └─ Q: "EMI Deduction Method?"    │
     │    [Full my account / Split /    │
     │     Co-borrower / Joint]         │
     │    → Select "Full my account" ✓  │
     │                                  │
     │ Step 3: Documents & Closure      │
     │ └─ (Collapsible) Chip Selection  │
     │    └─ Closure Plan:              │
     │       "How to handle this loan?" │
     │       [Self-funded / Top-up /    │
     │        Keep running /            │
     │        Not my liability]         │
     │       → Select option ✓          │
     │                                  │
     │ [ADD LOAN BUTTON]                │
     │ → Entry added to table ✓         │
     │                                  │
     │ Obligation Table                 │
     │ ├─ Loan 1: [HDFC, ₹50K EMI, ... │
     │ │          Term Loan]           │
     │ │          [Edit] [Delete]       │
     │ │                                │
     │ └─ [+ Add Another]               │
     │                                  │
     └──────────────────────────────────┘
```

**Implementation Details:**
- Gate on `ObligationsRunning == "Yes"` (already done)
- EMI delay history: Add showWhen rule
- Each field is logically dependent on previous answer
- Table shows summary of all entries
- User can add multiple loans

---

## Specific Implementation Changes

### Change 1: CreditScoreSection - Context-Aware Obligations Question

**File**: `src/lib/components/CreditScoreSection.svelte`

**Current** (lines 131-137):
```typescript
let showObligationsQuestion = $derived.by(() => {
  const score = Number(creditScore);
  if (!isValidScore(creditScore)) return false;
  if (score === -1 || score === 0) return true;
  return allGraduatedAnswered;
});
```

**Update**: Add context awareness
```typescript
// NEW PROP
interface Props {
  // ... existing props
  loanType?: string; // "Home Loan" | "Personal Loan" | etc
  isUnsecuredLoan?: boolean; // for quick check
}

let {
  // ... existing destructuring
  loanType = '',
  isUnsecuredLoan = false
}: Props = $props();

// UPDATED derived
let showObligationsQuestion = $derived.by(() => {
  const score = Number(creditScore);
  if (!isValidScore(creditScore)) return false;

  // NEW: Only show for unsecured loans (Personal, Professional, Business, DOD)
  if (loanType === 'Home Loan' || loanType === 'LAP' || loanType === 'Plot Loan') {
    return false; // Hide for secured loans
  }

  if (!isUnsecuredLoan) {
    return false; // Default: hide if not marked as unsecured
  }

  if (score === -1 || score === 0) return true;
  return allGraduatedAnswered;
});
```

**Props To Pass** (from home-loan +page.svelte):
```svelte
<CreditScoreSection
  // ... existing props
  loanType={loanType}
  isUnsecuredLoan={['Personal Loan', 'Professional Loan', 'Business Loan', 'Drop-line OverDraft (DOD)'].includes(loanType)}
/>
```

---

### Change 2: UnsecuredObligation - EMI Delay History Conditional

**File**: `src/lib/components/UnsecuredObligation.svelte`

**Current** (lines 821-831): Always shows EMI delay history

**Update**: Conditional based on loan type
```svelte
<!-- EMI Delay History (ONLY for Term Loans) -->
{#if currentLoanType && !['CC Limit', 'OD Limit', 'Dropline OD'].includes(currentLoanType)}
  <RadioField
    id="emiDelayHistory"
    label="How many EMI bounces in the last 12 months?"
    options={[
      { label: 'No delays', value: 'NONE' },
      { label: '1 delay', value: '1' },
      { label: '2+ delays', value: '2+' }
    ]}
    bind:value={emiDelayHistory}
    required={true}
    error={errors.emiDelayHistory || null}
  />
{/if}
```

**Logic**:
- Show ONLY if `currentLoanType` is term loan
- Hide if Credit Line (CC Limit, OD Limit, Dropline OD)

---

### Change 3: Obligation Page Schema - Add Visual Confirmation

**File**: `src/lib/config/homeLoanSchemaV2.json` (lines 1803-1829)

**Current**:
```json
{
  "id": "obligationsPage",
  "title": "Existing Loans",
  "showWhen": {
    "and": [
      { "==": [{ "var": "__applicantCount" }, 1] },
      { "==": [{ "var": "ObligationsRunning" }, "Yes"] }
    ]
  },
  "questions": []
}
```

**Add post-page messaging** (via component rendering):
```svelte
<!-- In home-loan/+page.svelte, after credit score section -->

{#if showCreditScore && formData.ObligationsRunning === 'No'}
  <!-- Confirmation that no obligations needed -->
  <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
    <div class="flex items-center gap-2 text-green-700">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
      </svg>
      <span class="font-medium">You've indicated no existing loans</span>
    </div>
    <p class="text-sm text-green-600 mt-1">
      The existing loans section will be skipped. You can continue to the next section.
    </p>
  </div>
{/if}
```

---

### Change 4: Update Obligation Question Label (Per Loan Type)

**File**: `src/lib/config/commonPage.json` (lines 183-270)

**Current** (line 200):
```json
"question": "Are there any existing loans or credit dues?"
```

**Update to be context-aware**:
```json
{
  "id": "q3_obligationsRunning",
  "bindsTo_template": "ObligationsRunning",
  "contextKey": "ObligationsRunning",
  "type": "radio",
  "required": true,
  "question": {
    "switch": [
      {
        "case": {
          "in": ["unSecureLoanType", ["Personal Loan", "Professional Loan"]]
        },
        "then": "Do you have any existing loans or credit card dues?"
      },
      {
        "case": {
          "in": ["unSecureLoanType", ["Business Loan"]]
        },
        "then": "Does the business have any existing loans or liabilities?"
      },
      {
        "default": "Are there any existing loans or credit dues?"
      }
    ]
  },
  "options": [
    {
      "label": "Yes, I have existing loans",
      "value": "Yes",
      "description": "I want to include details of current loans"
    },
    {
      "label": "No existing loans",
      "value": "No",
      "description": "This is a fresh start or all loans will be closed"
    }
  ]
}
```

**Benefits**:
- Clear language for each loan type
- Option descriptions help users decide
- More explicit "No" option reduces confusion

---

## Logical Flow Summary

### For Home Loan / LAP / Plot Loan Applicants
```
Credit Score Questions →
[Skip Obligations Question] →
Continue to next section
```

### For Personal / Professional / Business Loan Applicants
```
Credit Score Questions →
"Running loans?" Question →
  ├─ "No" → Skip Obligations Page → Continue
  └─ "Yes" → Enter Obligations Details:
     ├─ Loan Type (Term / CC / OD / etc)
     ├─ [Conditional fields based on type]
     ├─ Your Liability Info
     ├─ Documents & Closure Plan
     └─ Add to Table (Repeat as needed)
```

---

## Files to Modify

| File | Lines | Change | Complexity |
|------|-------|--------|-----------|
| `src/lib/components/CreditScoreSection.svelte` | 26-43, 131-137 | Add loanType prop + conditional | Medium |
| `src/lib/components/UnsecuredObligation.svelte` | 821-831 | EMI delay conditional | Low |
| `src/lib/config/commonPage.json` | 183-270 | Update question labels | Low |
| `src/routes/(app)/form/home-loan/+page.svelte` | 230-250 | Pass loanType context | Low |

---

## Backward Compatibility

✅ All changes are **backward compatible**:
- New props are optional with defaults
- showWhen logic only adds conditions
- Existing data structures unchanged
- No DB migrations needed
- No API changes

---

## Testing Checklist

- [ ] Home Loan: Obligations question hidden ✓
- [ ] Personal Loan + Obligations = Yes: Obligations page shown ✓
- [ ] Personal Loan + Obligations = No: Obligations page hidden ✓
- [ ] Term Loan: EMI delay shown ✓
- [ ] Credit Card Limit: EMI delay hidden ✓
- [ ] OD Limit: EMI delay hidden ✓
- [ ] Multi-applicant: Works correctly ✓
- [ ] Existing obligations data: Still loads ✓
- [ ] Form submission: Works end-to-end ✓

---

## Success Criteria

✅ Each question naturally leads to the next
✅ Irrelevant questions hidden based on loan type
✅ "No" answer completely skips obligations entry
✅ "Yes" answer shows logical field progression
✅ Credit line loans don't show EMI delay
✅ User sees confirmation when skipping obligations
✅ Form remains simple and intuitive
✅ Zero breaking changes
