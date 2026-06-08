# Form Question Editing Cheatsheet

> Quick reference for adding, modifying, or removing questions on any form page.

---

## File Locations

| What | Where |
|------|-------|
| Question definitions | `src/lib/config/{loanType}/questionBank/{pageName}.ts` |
| Page assembly | `src/lib/config/{loanType}/pages.ts` |
| Schema composer | `src/lib/config/{loanType}/composer.ts` |
| Wizard sidebar & guidance | `src/lib/config/wizardSections/{loanType}.ts` |
| JSON-Logic helpers | `src/lib/config/schema/jsonLogicHelpers.ts` |
| Type definitions | `src/lib/config/schema/schemaTypes.ts` |
| showWhen engine | `src/lib/config/showWhenEngine.ts` |
| Completion logic | `src/lib/utils/incomeTabState.ts` |
| Form pages | `src/routes/(app)/form/{loanType}/+page.svelte` |
| Options (home loan) | `src/lib/form/homeLoan/options.ts` |
| i18n labels | `src/lib/i18n/en.ts`, `hi.ts`, `mr.ts` |
| Payload builder | `src/lib/utils/casePayloadBuilder.ts` |

**Loan type folder names:** `homeLoan`, `lapLoan`, `plotLoan`, `personalLoan`, `businessLoan`, `professionalLoan`

---

## Question Structure

```typescript
export const q1_myQuestion: RawSchemaQuestion = {
    // ── IDENTITY ──
    id: 'q1_myQuestion',              // Unique ID (prefix with page order number)
    bindsTo_template: 'myAnswerKey',  // Where the answer is STORED (this matters, not id)
    contextKey: 'myAnswerKey',        // i18n lookup key (usually same as bindsTo)

    // ── TYPE & LAYOUT ──
    type: 'radio',                    // radio | select | text | checkbox | currency | tenure-select | tenure-input
    uiType: 'number',                // For numeric text inputs (not needed for currency)
    uiGroup: 'radio_fields',         // radio_fields | select_fields | number_fields
    radioClass: 'mt-[2rem] md:mt-[3rem]',
    optionContainerClass: 'grid md:grid-cols-2 gap-3',
    uiMeta: { icon: 'ClipboardList' },

    // ── CONTENT ──
    question: 'What is your question?',           // Static string
    description: "<div class='info-box'>...</div>", // HTML allowed
    required: true,

    // ── VISIBILITY ──
    showWhen: { '==': [{ var: 'loanType' }, 'New Loan'] },

    // ── OPTIONS (radio/select only) ──
    options: [
        { label: 'Option A', value: 'option_a', icon: 'Star' },
        { label: 'Option B', value: 'option_b', icon: 'Circle',
          showWhen: { '!=': [{ var: 'loanType' }, 'Top-up Only'] } }
    ],

    // ── VALIDATION (optional) ──
    validation: {
        condition: [{ case: { '<': [{ var: 'loanAmount' }, 100000] },
                      then: 'Minimum 1 lakh required' }]
    },

    // ── WARNING (optional) ──
    warning: {
        condition: [{ case: { '==': [{ var: 'myAnswerKey' }, 'risky_value'] },
                      then: 'This may limit lender options.' }]
    }
};
```

---

## showWhen — JSON-Logic Quick Reference

### Raw Syntax

| Pattern | Syntax | Example |
|---------|--------|---------|
| Equals | `{ '==': [{ var: 'field' }, value] }` | `{ '==': [{ var: 'loanType' }, 'New Loan'] }` |
| Not equals | `{ '!=': [{ var: 'field' }, value] }` | `{ '!=': [{ var: 'status' }, ''] }` |
| In array | `{ in: [{ var: 'field' }, [v1, v2]] }` | `{ in: [{ var: 'loanType' }, ['New Loan', 'Top-up Only']] }` |
| Not in array | `{ '!in': [{ var: 'field' }, [v1, v2]] }` | `{ '!in': [{ var: 'type' }, ['skip']] }` |
| Less than | `{ '<': [{ var: 'field' }, num] }` | `{ '<': [{ var: 'age' }, 65] }` |
| Greater than | `{ '>': [{ var: 'field' }, num] }` | `{ '>': [{ var: 'score' }, 750] }` |
| Less/equal | `{ '<=': [{ var: 'field' }, num] }` | `{ '<=': [{ var: 'amount' }, 5000000] }` |
| Greater/equal | `{ '>=': [{ var: 'field' }, num] }` | `{ '>=': [{ var: 'score' }, 300] }` |
| AND | `{ and: [cond1, cond2, ...] }` | `{ and: [{ '==': [...] }, { '!=': [...] }] }` |
| OR | `{ or: [cond1, cond2, ...] }` | `{ or: [{ '==': [...] }, { in: [...] }] }` |
| NOT | `{ '!': condition }` | `{ '!': { '==': [{ var: 'x' }, 'y'] } }` |

### Using `jl` Helpers (Cleaner)

Import: `import { jl } from '$lib/config/schema/jsonLogicHelpers';`

```typescript
jl.eq('loanType', 'New Loan')           // { '==': [{ var: 'loanType' }, 'New Loan'] }
jl.neq('status', '')                     // { '!=': [{ var: 'status' }, ''] }
jl.inArr('loanType', ['New Loan', 'BT']) // { in: [{ var: 'loanType' }, ['New Loan', 'BT']] }
jl.notInArr('loanType', ['Top-up'])      // { '!in': [{ var: 'loanType' }, ['Top-up']] }
jl.notEmpty('propertyIdentified')        // { '!=': [{ var: 'propertyIdentified' }, ''] }
jl.lte('age', 60)                        // { '<=': [{ var: 'age' }, 60] }

// Compose
jl.and(jl.eq('loanType', 'New Loan'), jl.notEmpty('propertyIdentified'))
jl.or(jl.eq('loanType', 'New Loan'), jl.inArr('loanType', ['BT', 'Top-up']))
jl.not(jl.eq('loanType', 'Top-up Only'))
```

### Reusable Fragments (Best Practice)

Define at top of file, reuse across questions:

```typescript
const IS_DC = { '==': [{ var: 'loanType' }, 'Debt Consolidation'] };
const IS_DC_ANY = { in: [{ var: 'loanType' }, ['Debt Consolidation', 'Debt Consolidation with Extra Funds']] };
const IS_CREDIT_LINE = { in: [{ var: 'unSecureLoanType' }, ['Overdraft (OD)', 'Drop-line OverDraft (DOD)', 'Cash Credit (CC)']] };
const NOT_DC = { '!': IS_DC_ANY };

// Use in questions:
showWhen: jl.and(NOT_DC, jl.notEmpty('loanPurpose'))
```

---

## Dynamic Question Text (SwitchArray)

When question text varies by context:

```typescript
question: {
    switch: [
        { case: { '==': [{ var: 'loanType' }, 'Top-up Only'] },
          then: 'Has this property been assessed for top-up?' },
        { case: { in: [{ var: 'loanType' }, ['BT Only', 'BT + Top-up']] },
          then: 'Was this property assessed during the original loan?' }
    ],
    default: 'Has this property been assessed before?'
} as unknown as string,  // Type cast needed for SwitchArray
```

Works for: `question`, `description`, `descriptionHeader`

---

## Currency Type (₹ Fields)

Use `type: 'currency'` for any rupee amount field. It auto-provides:
- ₹ icon
- Indian comma formatting (1,00,000)
- Number-to-words text below ("One Lakh")
- Numeric keyboard on mobile

```typescript
// Simple — all defaults handled automatically
{
    type: 'currency',
    uiMeta: { placeholder: 'Enter amount in rupees' }
}

// Full example
export const q_loanAmount: RawSchemaQuestion = {
    id: 'q_loanAmount',
    bindsTo_template: 'loanAmount',
    type: 'currency',                    // ← Just this. No uiType, uiGroup, icon, or showNumberInWords needed
    textClass: 'mt-8 md:mt-12',
    uiMeta: {
        placeholder: 'Enter loan amount'
    },
    required: true,
    question: 'What is the required loan amount?'
};
```

**What you DON'T need** (auto-handled by `currency` type):
- ~~`uiType: 'number'`~~ — implied
- ~~`uiGroup: 'number_fields'`~~ — implied
- ~~`icon: 'indian-rupee'`~~ — implied
- ~~`showNumberInWords: true`~~ — implied

**Min/Max validation** (optional — errors shown inline, empty fields are fine):
```typescript
{
    type: 'currency',
    minLimit: 100000,    // ₹1 Lakh minimum — shows "Minimum amount is ₹1,00,000"
    maxLimit: 50000000,  // ₹5 Crore maximum — shows "Maximum amount is ₹5,00,00,000"
    uiMeta: { placeholder: 'Enter amount' }
}
```

**Opt-out**: To hide number-to-words text on a specific currency field:
```typescript
uiMeta: { placeholder: '...', hideNumberInWords: true }
```

**Override icon**: To use a different icon (rare):
```typescript
uiMeta: { placeholder: '...', icon: 'custom-icon' }
```

---

## Tenure Types (Loan Term Fields)

Two types for loan tenure: dropdown or text input.

### `tenure-select` — Dropdown with auto-generated options

```typescript
{
    type: 'tenure-select',
    tenureUnit: 'years',     // 'years' | 'months'
    minLimit: 1,             // First option
    maxLimit: 7,             // Last option → generates "1 year", "2 years"... "7 years"
    uiMeta: { placeholder: 'Select tenure' }  // optional override
}
```

### `tenure-input` — Free text with min/max validation

```typescript
{
    type: 'tenure-input',
    tenureUnit: 'years',     // 'years' | 'months'
    minLimit: 5,             // Shows "Minimum tenure is 5 Years"
    maxLimit: 40,            // Shows "Maximum tenure is 40 Years"
}
```

**What you DON'T need** (auto-handled):
- ~~`icon: 'calendar'`~~ — auto: `calendar-range` (years) / `calendar-days` (months)
- ~~`uiType: 'number'`~~ — implied for tenure-input
- ~~`options: [...]`~~ — auto-generated for tenure-select from minLimit/maxLimit
- ~~`placeholder`~~ — auto: "Select tenure in Years" / "Enter tenure in Months"

**Override options**: If you need custom options (e.g., "MAX", "OTHER"), pass `options` array — it takes priority over auto-generation.

---

## Option Structure

```typescript
options: [
    {
        label: 'Display Text',        // What user sees
        value: 'stored_value',         // What gets stored (THIS is what showWhen compares)
        icon: 'Star',                  // Lucide icon name
        uiMeta: { icon: 'Circle' },   // Alternative icon spec
        description: 'Helper text',    // Shown below label
        helperText: 'Extra info',      // Tooltip/info

        // Option-level visibility (hide this option conditionally)
        showWhen: { '!=': [{ var: 'loanType' }, 'Top-up Only'] }
    }
]
```

**CRITICAL: showWhen compares VALUES, not labels.** If select shows "Ready to Move" but stores `"ready_to_move"`, use `"ready_to_move"` in showWhen.

---

## Page Assembly

### Building a Page

```typescript
// pages.ts
export function buildMyPage(): RawSchemaPage {
    return {
        id: 'myPage_homeLoan',                          // Unique page ID
        title: 'My Page Title',
        showWhen: { '!=': [{ var: 'loanType' }, ''] },  // Gate entire page (optional)
        nextButtonVisibility: { mode: ['allRequiredAnswered'] },
        questions: [q1_myQuestion, q2_anotherQuestion]   // Order matters
    };
}
```

### Registering the Page

Add to `getAllPages()` in the same `pages.ts`:

```typescript
export function getAllPages(): RawSchemaPage[] {
    return [
        buildCaseIntakePage(),
        buildPropertyLocationPage(),
        buildMyPage(),              // <-- Insert at correct position
        buildPropertyCharacterPage(),
        // ...
    ];
}
```

---

## Wizard Sections (Sidebar + Guidance)

### Structure

```
WizardSection (e.g., "Property Details")
  -> WizardSubsection (e.g., "Property Character")
       -> pageIds: ['propertyCharacter_homeLoan']   // Maps to schema page IDs
       -> contextInfo: { title, dsaGuidance }        // Right panel content
```

### DSA Guidance Format (use for all new work)

```typescript
dsaGuidance: {
    summary: string,      // What this section does from DSA perspective
    keyPoints: string[],  // Key operational points
    watchFor: string[],   // Common pitfalls / red flags
    proTips: string[]     // Experienced DSA tips
}
```

### Adding a New Subsection

In `src/lib/config/wizardSections/{loanType}.ts`:

```typescript
{
    id: 'my-subsection',
    label: 'My Subsection',
    pageIds: ['myPage_homeLoan'],    // Must match page ID from pages.ts
    contextInfo: {
        title: 'My Subsection Title',
        dsaGuidance: {
            summary: 'What this captures and why it matters.',
            keyPoints: ['Point 1', 'Point 2'],
            watchFor: ['Common mistake 1'],
            proTips: ['Pro tip 1']
        }
    }
}
```

### Dynamic Guidance (optional)

```typescript
getDynamicGuidance: (answers) => {
    const g: Partial<DsaGuidance> = {};
    if (answers['loanType'] === 'Balance Transfer Only') {
        g.keyPoints = ['BT selected — existing loan details required'];
    }
    return g;
}
```

---

## Checklist: What to Update When Changing Questions

### Adding a Question

- [ ] **Question bank** — Create question in `questionBank/{page}.ts`
- [ ] **Page builder** — Add to questions array in `pages.ts`
- [ ] **Wizard sections** — Update `pageIds` if new page; update `dsaGuidance` if context changed
- [ ] **Completion logic** — If question is on income/profile tabs, check `incomeTabState.ts`
- [ ] **Next button** — If required question, verify `isNextEnabled` in `+page.svelte`
- [ ] **Payload builder** — If bindsTo key needs to reach API, update `casePayloadBuilder.ts`
- [ ] **i18n** — If label needs translation, add to `en.ts`, `hi.ts`, `mr.ts`
- [ ] **Tests** — Update schema composer tests, showWhen tests

### Removing/Hiding a Question

- [ ] **Question bank** — Remove export or add restrictive `showWhen`
- [ ] **Page builder** — Remove from questions array if deleting
- [ ] **Completion logic** — **CRITICAL:** Check `computeSectionCompletion()` in `incomeTabState.ts` — hidden required questions silently block Next button
- [ ] **Next button** — Check `isNextEnabled` doesn't reference the removed bindsTo key
- [ ] **Wizard showWhen** — Check section/subsection visibility doesn't depend on this answer
- [ ] **Downstream showWhen** — Search for `{ var: 'removedBindsToKey' }` in ALL question banks
- [ ] **Payload builder** — Remove or handle missing key gracefully
- [ ] **Tests** — Update/remove related tests

### Modifying showWhen Logic

- [ ] **Test all branches** — Verify question shows/hides correctly for each condition
- [ ] **Check cascading** — If question A's showWhen depends on question B, and B is hidden, A may also hide
- [ ] **Check Next button** — Required hidden question = blocked Next button
- [ ] **Check page-level showWhen** — If all questions on a page are hidden, consider hiding the page too

### Changing Options

- [ ] **Update values** — Change `value` field (not just `label`)
- [ ] **Update downstream showWhen** — Search for old value in all question banks
- [ ] **Update reusable fragments** — If `IS_DC`, `IS_CREDIT_LINE` etc. reference the old value
- [ ] **Update completion logic** — If completion checks compare specific option values
- [ ] **Update tests** — Test fixtures may use old values

---

## Next Button (isNextEnabled) Logic

Standard pages: all required **visible** questions must be answered.

```typescript
// Simplified from +page.svelte
let isNextEnabled = $derived.by(() => {
    // Special pages (profile, income, credit, obligations)
    // use computeSectionCompletion() instead

    // Standard pages:
    const requiredVisible = visibleQuestions.filter(q => q.required);
    let enabled = requiredVisible.every(q => {
        const val = currentAnswers[q.bindsTo];
        return val !== undefined && val !== null && val !== '';
    });

    // Additional gates:
    if (hasInputErrors()) enabled = false;        // Validation errors
    if (pincodeValidationError) enabled = false;  // Pincode mismatch
    if (riskBlocks.length > 0) enabled = false;   // Unresolved NBFC risks
    return enabled;
});
```

**Special pages** use `computeSectionCompletion()`:
- `applicantProfilePage` — profile tab completion
- `incomeProfilesPage` — income selection completion
- `incomeDetailsPage` — income entry completion
- `creditScorePage` — credit score + factors completion
- `obligationsPage` — obligations declaration completion

---

## bindsTo Key Rules

```
Question ID:        q4_propertyStateName
bindsTo_template:   propertyStateName
Stored at:          answers['propertyStateName']    <-- This is what matters
```

- **Always** use bindsTo keys in `showWhen`, `getDynamicGuidance`, `caseRouteData`
- **Never** use question IDs for data lookup
- `combinedAnswers` creates shorthand aliases by splitting on `_` and taking the last segment

### Case Route Tracker Keys

| Loan Type | Keys |
|-----------|------|
| Secured (Home/LAP/Plot) | `propertyStateName`, `propertyCityName`, `propCost`, `PropertyStage` |
| Unsecured (Personal/Business) | `residenceStateName`, `residenceCityName`, `loanAmount` |
| Professional | `businessStateName`, `businessCityName`, `loanAmount` |
| All | `loanName`, `__applicantCount`, `loanType` |

---

## Common Gotchas

| Gotcha | Fix |
|--------|-----|
| showWhen compares VALUES not LABELS | Check `options[].value`, not `options[].label` |
| Hidden required question blocks Next | Update `computeSectionCompletion()` or remove `required: true` |
| `!=` with empty answers returns false | `{ '!=': [{ var: 'x' }, 'y'] }` returns false when x is `''`/`null`/`undefined` — use `notEmpty` for "has been answered" checks |
| Schema enum is "New Loan" not "New Home Loan" | Always verify exact option values |
| SwitchArray needs type cast | Add `as unknown as string` after the switch object |
| Short keyword substring matching | Use word-boundary regex (`\b...\b`) for keywords <= 3 chars |
| Removed question still in completion check | Search `incomeTabState.ts` for the bindsTo key |
| Page showWhen vs question showWhen | Page-level hides entire page; question-level hides individual fields |

---

## Verification After Changes

```bash
pnpm run check        # TypeScript errors (must be 0)
pnpm run test:unit    # Tests pass
pnpm run dev          # Visual check in browser
```

Test scenarios:
1. Fresh form — does the question appear at the right time?
2. Toggle the showWhen condition — does it show/hide correctly?
3. Leave the question empty — does Next button block appropriately?
4. Fill the question — does the downstream question appear?
5. Change loan type — does the dynamic text update?
