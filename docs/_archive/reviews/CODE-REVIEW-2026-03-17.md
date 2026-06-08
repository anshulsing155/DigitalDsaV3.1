# Code Review — 2026-03-17

**Scope:** Commit `de895cab` — Deep Business Profiling for Company Applicants (Session 31)
**Period:** March 17, 2026
**Reviewer:** Automated daily review
**Files:** 14 files changed (1,650 insertions, 155 deletions) — 9 modified + 2 new + 3 docs

---

## Executive Summary

Session 31 implemented deep, business-type-specific assessment for Company applicants in unsecured loans. 5 phases: page hiding for Company-only applicants, prop threading, question config, UI integration, and tests.

**Verdict:** 1 HIGH bug in prop sourcing (professionalCategory reads from wrong location), 3 MEDIUM consistency/robustness issues, 4 LOW cosmetic items. **8 total action items.**

---

## 1. HIGH — `professionalCategory` Reads from Wrong Source

**Files:** `src/lib/components/IncomePageNew.svelte:831, 936`
**Commit:** `de895cab`

The `professionalCategory` prop reads from `formState.applicationData?.professionalCategory`, but this field is **never set** on `applicationData`. Professional category is stored:

- On the **applicant object** (via `AddApplicantProfessional.svelte:267, 579-580`)
- In **loanData** answers (via schema question `q1_professionalCategory` with `bindsTo_template: "professionalCategory"`)

**Impact:** For professional loan Company applicants, `professionalCategory` is always `undefined` → `CompanyBusinessProfile` only shows the 8-question common "Practice Operations" section, never the category-specific sections (Medical 6, CA/CS 5, Legal 5, Architect 5). Degraded experience, not a crash.

**Note:** `loanCategory` (set via `setApplicationField` in onMount) and `businessEntityType` (set via `replaceApplicationData` in `AddApplicantBusiness.svelte:362`) both work correctly — only `professionalCategory` has this issue.

**Fix:** Read from the applicant object instead of applicationData:

```svelte
<!-- Single-applicant path (line 831) -->
professionalCategory={formState.applicants[0]?.professionalCategory as string}

<!-- Multi-applicant modal path (line 936) -->
professionalCategory={formState.applicants[selectedIndex]?.professionalCategory as string}
```

---

## 2. MEDIUM — Medical Specialization Option Values Inconsistent

**File:** `src/lib/config/deepBusinessProfile/index.ts` (MEDICAL_SECTION, `specialization` question)
**Commit:** `de895cab`

Option values use inconsistent naming patterns:

- Abbreviated: `Ortho`, `Cardio`, `Neuro`, `Gynaec`
- Full names: `General`, `Dental`, `Paediatric`, `Other`
- Non-technical: `Eye` (label says "Ophthalmology")

**Impact:** Inconsistent database values; hard to query/report on. The label says "Ophthalmology" but value stores "Eye".

**Fix:** Standardize to match labels:

```typescript
{ label: 'Ophthalmology', value: 'Ophthalmology' },
{ label: 'Cardiology', value: 'Cardiology' },
{ label: 'Orthopaedics', value: 'Orthopaedics' },
// etc.
```

---

## 3. MEDIUM — Legal Practice Area `IP` Abbreviation Breaks Value Convention

**File:** `src/lib/config/deepBusinessProfile/index.ts` (LEGAL_SECTION, `practiceArea` question)
**Commit:** `de895cab`

All other values use full names (`Civil`, `Criminal`, `Corporate`, `Real Estate`, `Labour`), but one uses abbreviation:

```typescript
{ label: 'Intellectual Property', value: 'IP' },
```

**Fix:** Use full name for consistency:

```typescript
{ label: 'Intellectual Property', value: 'Intellectual Property' },
```

---

## 4. MEDIUM — Test Coverage Gap: Keyword Matching Edge Cases

**File:** `src/lib/testing/__tests__/deepBusinessProfile.test.ts`
**Commit:** `de895cab`

33 tests cover happy paths but miss keyword matching edge cases:

- Case sensitivity: `'doctor'` (lowercase) vs `'Doctor'`
- Substring false positives: `'Catalog Manager'` should NOT match CA category
- Multiple keywords present: `'Advocate CA'` — which wins?
- Null/empty string handling for `professionalCategory`

**Fix:** Add edge case tests:

```typescript
describe('Edge Cases', () => {
	it('handles case-insensitively', () => {
		const result = getDeepProfileSections('professional', undefined, 'doctor');
		expect(result).toHaveLength(2);
	});
	it('does NOT match CA in "Catalog"', () => {
		const result = getDeepProfileSections('professional', undefined, 'Catalog Manager');
		expect(result).toHaveLength(1); // only common
	});
	it('handles empty string', () => {
		const result = getDeepProfileSections('professional', undefined, '');
		expect(result).toHaveLength(1);
	});
});
```

---

## 5. LOW — Multi-Select Toggle Missing Array Type Guard

**File:** `src/lib/components/CompanyBusinessProfile.svelte` (toggleDeepMultiSelect function)
**Commit:** `de895cab`

```typescript
const current = (deepProfile[questionId] as string[] | undefined) ?? [];
```

If the field was previously stored as a scalar (string), spreading it would create an array of characters, not an array with one element.

**Fix:**

```typescript
let current = deepProfile[questionId] ?? [];
if (!Array.isArray(current)) current = [];
```

---

## 6. LOW — Error Messages Missing ARIA `role="alert"`

**File:** `src/lib/components/CompanyBusinessProfile.svelte` (validation error paragraphs)
**Commit:** `de895cab`

Required-field error messages lack screen reader announcement:

```svelte
<p class="text-xs text-red-500">This field is required</p>
```

**Fix:**

```svelte
<p class="text-xs text-red-500" role="alert">This field is required</p>
```

---

## 7. LOW — Dark Mode Hover States Incomplete on Checkbox Cards

**File:** `src/lib/components/CompanyBusinessProfile.svelte` (indicator checkbox cards)
**Commit:** `de895cab`

Base states have dark mode (`dark:border-gray-600 dark:bg-gray-800`), but hover states only partially covered — missing `dark:hover:bg-*` variant on some cards.

---

## 8. LOW — Professional Category Map Order Comment Missing

**File:** `src/lib/config/deepBusinessProfile/index.ts` (PROFESSIONAL_CATEGORY_MAP)
**Commit:** `de895cab`

The map order matters (legal must come before CA/CS to prevent "advocate" matching "ca"). No comment documents this ordering requirement, making it fragile for future maintainers.

**Fix:** Add comment:

```typescript
// ORDERING MATTERS: Legal keywords checked BEFORE CA/CS because
// "advocate" contains "ca" substring. Word-boundary regex protects
// keywords ≤3 chars, but ordering provides defense-in-depth.
```

---

## Security Assessment

No security vulnerabilities found. All modifications are configuration/component changes. No `{@html}` directives, no server routes, no PII handling, no auth logic touched. XSS protection verified — all user content rendered via Svelte interpolation.

---

## Positive Observations

- **showWhen changes are impeccable**: `SINGLE_INDIVIDUAL` constant consistently applied to all 4 custom component pages across all 3 loan types, with correct compound OR for obligations/DC
- **`__onlyCompanyApplicant` correctly set** in both `evaluateOnServer` and `combinedAnswers` in all 3 `+page.svelte` files
- **Question config well-structured**: All 61 question IDs unique, proper Indian business context, logical ordering
- **Svelte 5 runes usage correct**: `$state`, `$derived`, `$derived.by`, `$effect` all properly used
- **Data isolation**: `applicant.deepProfile` separate namespace prevents key collisions with existing 6 questions
- **Test suite**: 33 tests with good structural validation (type checks, options presence, ID uniqueness)

---

## Priority Action Items

| #   | Severity | Issue                                                                | Effort |
| --- | -------- | -------------------------------------------------------------------- | ------ |
| 1   | HIGH     | Fix `professionalCategory` prop source (applicationData → applicant) | 5min   |
| 2   | MEDIUM   | Standardize medical specialization option values                     | 10min  |
| 3   | MEDIUM   | Fix legal `IP` abbreviation                                          | 2min   |
| 4   | MEDIUM   | Add keyword matching edge case tests                                 | 15min  |
| 5   | LOW      | Add Array.isArray guard for multi-select toggle                      | 2min   |
| 6   | LOW      | Add ARIA role="alert" to error messages                              | 5min   |
| 7   | LOW      | Add dark mode hover states                                           | 5min   |
| 8   | LOW      | Add ordering comment to PROFESSIONAL_CATEGORY_MAP                    | 2min   |
