# Code Review — 2026-03-15

**Scope:** 15 commits from `2b4c8ad7` to `9ae6b879` (Sessions 23–26)
**Period:** March 12–15, 2026
**Files changed:** 172 files, +27,208 / −27,549 lines
**Reviewer:** Automated daily review

---

## Executive Summary

Major work across 4 areas: (1) anti-scraping hardening with showWhen obfuscation, (2) unsecured loan applicant redesign with 4 new components, (3) full 6-loan-type TypeScript schema migration, (4) Company Director architecture. No critical security vulnerabilities found. Several medium-priority issues warrant attention.

**Verdict:** Significant work, mostly well-architected but with notable regressions. 6 security findings, 2 engine bugs, 3 schema migration issues, 8 unsecured-applicant issues, 9 Company Director issues. **8 critical, 4 high, 10 medium, 7 low, 1 hygiene. 30 total action items.**

---

## 1. Security Findings

### SEC-1: ShowWhen Decode Failure Shows All Questions (MEDIUM)

**File:** `src/lib/config/showWhenDecoder.ts:32-34`

When XOR decode fails (tampered/corrupt data), the function returns `null`, which `shouldShow(null, answers)` treats as "always visible". An attacker who corrupts the encoded showWhen string would see ALL questions on a page instead of none.

```typescript
// Current behavior
catch { return null; } // → shouldShow(null) → true → question visible

// Recommended: hide on failure (fail-closed)
catch { return { '==': ['__never__', '__match__'] }; } // → always false → hidden
```

**Risk:** Low-medium. Attacker would need to modify the client JS to corrupt specific showWhen values. They'd still need valid auth + session. But the fail-open posture is philosophically wrong for an anti-scraping system.

### SEC-2: SMTP Password in Source Code Comment (LOW)

**File:** `vite.config.ts:9`

```
'[P0.5] EMAIL HARDENING — Migrate SMTP (mail.digitaldsa.com / Password@123) to SES...'
```

The literal password `Password@123` appears in a prelaunch reminder string. While this is flagged for rotation, having it in committed source code is a credential exposure. Remove the password from the reminder text.

### SEC-3: `answers` Map Passed to Engine Without Validation (HIGH)

**File:** `src/routes/api/form/evaluate/+server.ts:44,85`

The `answers` object from the request body is passed directly to the form engine with no type, key, or size validation:

```typescript
const { loanType, pageIndex, answers } = body as unknown as FormEvaluateRequest;
// ... answers flows into engine.evaluatePage(pageIndex, answers, options)
```

Inside `buildCombinedAnswers()`, every key-value pair in `answers` is merged into the combined map. The `flagKey` resolution block (engine.ts:680-692) copies attacker-controlled values into the answer context. Additionally, `pageIndex` is not validated as a non-negative integer — non-numeric values pass the falsy check.

**Fix:** Add input validation before the engine call:

```typescript
if (typeof pageIndex !== 'number' || !Number.isInteger(pageIndex) || pageIndex < 0) {
	return json({ success: false, error: 'Invalid page index' }, { status: 400 });
}
if (typeof answers !== 'object' || Array.isArray(answers) || answers === null) {
	return json({ success: false, error: 'Invalid answers' }, { status: 400 });
}
for (const key of Object.keys(answers)) {
	if (key.startsWith('$') || key.includes('.')) {
		return json({ success: false, error: 'Invalid answer key' }, { status: 400 });
	}
}
```

### SEC-4: `loanType` Error Leaks All Schema Names (MEDIUM)

**File:** `src/lib/server/formEngine/schemaLoader.ts:103-106`

An invalid `loanType` triggers an error that lists all available schema names:

```
[FormEngine] Unknown loan type: "x". Available types: Home Loan, LAP, Plot Loan, ...
```

This is returned to the client via the API error handler. Validate `loanType` against `getAvailableLoanTypes()` before calling `createFormEngine()` and return a generic 400.

### SEC-5: Rate Limiter Off-By-One + Single-Process Only (MEDIUM)

**File:** `src/lib/server/formGuard.ts:57-58`

`entry.count++` increments before the `entry.count > maxPerMinute` check, so the effective limit is `maxPerMinute + 1`. Should use `>=`. Also, the in-memory `Map` doesn't work across Node.js cluster processes — a scraper hitting 4 workers gets 4x the rate limit.

### SEC-6: Error Messages Leak Internal State (LOW)

**Files:** `src/routes/api/form/evaluate/+server.ts:104`, `src/routes/api/form/options/+server.ts:81`

Raw `err.message` from internal errors could leak schema structure or internal paths. In production, prefer a generic message and log the detail server-side.

---

## 2. Bug Findings

### BUG-1: Schema Composed at Module Load, Then Deep-Cloned via JSON.parse(JSON.stringify()) (MEDIUM)

**File:** `src/lib/server/formEngine/schemaLoader.ts:53-60, 110`

```typescript
const mainSchemaMap: Record<string, unknown> = {
	'Home Loan': composeHomeLoanSchema(), // Called at import time
	LAP: composeLapLoanSchema() // Called at import time
	// ...
};

export function loadSchema(loanType: string): RawSchema {
	return JSON.parse(JSON.stringify(schema)) as RawSchema; // Deep clone
}
```

Two issues:

1. **All 6 schemas compose on first import** — even if only 1 loan type is requested. For 6 schemas × potentially hundreds of questions, this adds unnecessary startup time.
2. **`JSON.parse(JSON.stringify())` for cloning** — CLAUDE.md explicitly warns against this pattern. While schema data is JSON-safe (no Dates/Maps/Sets), it's inconsistent with the project convention to use `structuredClone()`.

**Recommendation:** Use lazy composition (compose on first request per type, cache result). Replace `JSON.parse(JSON.stringify())` with `structuredClone()`.

### BUG-2: btoa Spread Operator Stack Overflow Risk (LOW)

**File:** `src/lib/server/formEngine/engine.ts:51`

```typescript
return btoa(String.fromCharCode(...result));
```

`String.fromCharCode(...result)` spreads all bytes as function arguments. For very large showWhen conditions (100KB+ JSON), this would exceed the call stack limit. Current schemas have small conditions, but a future complex nested condition could trigger this.

**Recommendation:** Use a chunked approach:

```typescript
let str = '';
for (let i = 0; i < result.length; i++) str += String.fromCharCode(result[i]);
return btoa(str);
```

---

## 3. Architecture & Quality Observations

### ARC-1: Deterministic Question Shuffle May Break Layout Groups (INFO)

**File:** `src/lib/server/formEngine/engine.ts:277-278`

Questions with `layoutGroup` or sequential `uiGroup` dependencies are shuffled per session. If two questions reference the same `layoutGroup`, shuffling could separate them visually.

**Current guard:** Only shuffles pages with 3+ questions. But layout groups aren't checked.

**Recommendation:** Either skip shuffling for pages that use `layoutGroup`/`uiGroup`, or shuffle within groups only.

### ARC-2: Untracked Utility Scripts in Repo Root (HYGIENE)

Three files left in repo root from schema analysis work:

- `analyze-schemas.cjs` — references deleted JSON schemas
- `analyze-schemas.js` — same
- `find-pages.cjs` — same

These reference files that no longer exist (`LAP-schema.json`, `plot-loan-schema.json`, etc.) and will error if run. Should be deleted or moved to `scripts/_archive/`.

### ARC-3: formGuard setInterval Without Cleanup (INFO)

**File:** `src/lib/server/formGuard.ts:66-76`

```typescript
setInterval(
	() => {
		// cleanup stale rate limits
	},
	5 * 60 * 1000
);
```

This runs forever with no way to stop it. In production (single server process), this is fine. But in dev with HMR, each module reload creates a new interval without clearing the old one. Consider using a module-level flag or `clearInterval` pattern for dev.

### ARC-4: `clearForLoanType` Uses Unsafe Cast (INFO)

**File:** `src/lib/state/form.svelte.ts:710`

```typescript
const currentCategory = (this.applicationData as any)?.loanCategory as string | undefined;
```

The `as any` bypasses TypeScript safety. If `loanCategory` is added to the `ApplicationData` type, this cast can be removed.

---

## 4. Cross-Step Contradiction System — Well Designed

The new contradiction detection system (`crossStepValidator.ts`, `ContradictionWarningModal.svelte`) is well-architected:

- Pure function, no side effects, no Svelte dependency
- Clear separation between detection and cleanup
- Proper deduplication of reciprocal relationships
- Good severity model (error vs warning)
- Immutable cleanup (returns new array, caller handles mutation)

The fingerprint timing fix (`onMount` + `tick()` + `Promise.resolve()`) correctly addresses the false-positive issue from `$effect` auto-set mutations.

---

## 5. Schema Migration — Two Critical Regressions Found

The TypeScript composition structure is well-organized (consistent `composer.ts` → `pages.ts` → `questionBank/` pattern across all 6 types), but the migration introduced 2 critical behavioral bugs:

### SCHEMA-1: `jl.notInArr` Emits Invalid JSON-Logic Operator `'!in'` (CRITICAL)

**File:** `src/lib/config/schema/jsonLogicHelpers.ts:24-26`

```typescript
notInArr: (varName: string, values: (string | number)[]): RulesLogic => ({
    '!in': [{ var: varName }, values]  // ← '!in' is NOT a json-logic-js operator
}),
```

`json-logic-js` only supports `'in'`, not `'!in'`. When the engine calls `jsonLogic.apply({ '!in': ... }, data)`, it returns undefined — silently failing. This means validation rules using `notInArr` (e.g., coastal/cantonment/tribal state restrictions in `propertyLocation.ts`) **never fire errors**.

**Fix:** Use the negation wrapper: `{ '!': [{ in: [{ var: varName }, values] }] }`

### SCHEMA-2: `SHOW_WHEN_PROPERTY_LOCATION` Shows Page When `propertyIdentified == "No"` (CRITICAL)

**File:** `src/lib/config/homeLoan/pages.ts:37-48`

The composed version uses `{ '!=': [{ var: 'propertyIdentified' }, ''] }` (not-empty), but the original JSON uses `{ '==': [{ var: 'propertyIdentified' }, 'Yes'] }` (strict equality). This means the Property Location page now shows when the DSA says "No, property not identified" — presenting irrelevant questions.

The test in `schemaComposer.test.ts:36` lists this page in `DIVERGENT_PAGE_SHOWWHEN` and **skips the equivalence check**, so the regression passes testing undetected.

**Fix:** `{ '==': [{ var: 'propertyIdentified' }, 'Yes'] }`

### SCHEMA-3: Plot Loan `existingDetailsPage` Title Is Lowercase (LOW)

**File:** `src/lib/config/plotLoan/pages.ts:190`

Title is `'existing details'` (lowercase) while all other pages use Title Case. Visible in sidebar UI. Pre-existing from the JSON but should be fixed to `'Current Loan Details'`.

---

## 6. Company Director Architecture — Correct Graph Analysis

`familyControlDerivation.ts` uses Union-Find (path compression + rank) for family cluster detection. Algorithm is correct:

- O(α(n)) per union/find operation
- Properly handles edge cases (single director, no relationships)
- 50% threshold for family control is a reasonable business rule
- Ownership percentage aggregation for stake calculation

---

## 7. Alignment with Project Objectives

| Objective                       | Status           | Notes                                                                                      |
| ------------------------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| AD-14: Anti-scraping (8 layers) | **Strengthened** | ShowWhen obfuscation, DOM ID hashing, response fingerprinting, deterministic shuffle added |
| AD-02: Immutable snapshots      | **Maintained**   | Contradiction cleanup creates new arrays, not mutations                                    |
| AD-06: No PII in v1 PDF         | **Not affected** | No changes to PDF generation                                                               |
| Income profiling (moat)         | **Enhanced**     | Cross-step contradiction detection protects income profile integrity                       |
| Server-side everything          | **Maintained**   | showWhen evaluation on server, client only gets encoded conditions                         |

---

## Action Items

| #   | Priority    | Action                                               | File(s)                                     |
| --- | ----------- | ---------------------------------------------------- | ------------------------------------------- |
| 1   | **HIGH**    | Fail-closed on showWhen decode failure               | `showWhenDecoder.ts`                        |
| 2   | **HIGH**    | Remove literal password from vite.config.ts reminder | `vite.config.ts`                            |
| 3   | **MEDIUM**  | Generic error messages in production API responses   | `evaluate/+server.ts`, `options/+server.ts` |
| 4   | **MEDIUM**  | Lazy schema composition + structuredClone            | `schemaLoader.ts`                           |
| 5   | **LOW**     | Fix btoa spread for large showWhen                   | `engine.ts`                                 |
| 6   | **LOW**     | Skip shuffle for layoutGroup pages                   | `engine.ts`                                 |
| 7   | **HYGIENE** | Delete/archive stale root scripts                    | `analyze-schemas.*`, `find-pages.cjs`       |

---

---

## 8. Unsecured Applicant Redesign — Deep Review

### UA-1: ContradictionWarningModal Button Styling Inverted (CRITICAL UX)

**File:** `src/lib/components/ContradictionWarningModal.svelte:170-199`

"Go Back" (safe action) has the gold primary gradient. "Proceed & Remove" (destructive) is a muted red outline button. A DSA in a hurry will instinctively click the visually dominant gold button — which is "Go Back", the opposite of what they may intend. This inverts the app's convention where gold gradient = primary/proceed action.

**Fix:** Swap styles. "Go Back" → neutral border. "Proceed & Remove" → filled red or clearly destructive styling.

### UA-2: `navigatePrevious()` Fires Wrong Handler for Company Business Loans (CRITICAL)

**File:** `src/lib/components/ApplicantFormUnsecured.svelte:301-306`

```typescript
export function navigatePrevious() {
	if (step0SubView === 'directorDetails') previousFromDirectorDetails();
	// ...
}
```

`step0SubView === 'directorDetails'` fires regardless of `currentView`. When `handleRelationShipPrevious()` sets `step0SubView = 'directorDetails'`, the next call to `navigatePrevious()` from the relationship page calls `previousFromDirectorDetails()` instead of `handleRelationShipPrevious()`. This breaks the exported API used by `FormShell` for company business loans.

**Fix:** Guard with `currentView`:

```typescript
if (currentView === 'addApplicant' && step0SubView === 'directorDetails') ...
```

### UA-3: `lastEntityType` Not `$state`, Missed Entity Changes on Remount (CRITICAL)

**File:** `src/lib/components/AddApplicantBusiness.svelte:274`

`lastEntityType` is `let` (not `$state`). On component remount (navigate away and back), it resets to `undefined`, so entity type changes are not detected and stale company data persists with the wrong `companyType`.

**Fix:** Use `let lastEntityType = $state<string | undefined>(undefined);`

### UA-4: `saveCompany()` Writes `companyType: undefined` If `entityConfig` Is Null (MEDIUM)

**File:** `src/lib/components/AddApplicantBusiness.svelte:576-589`

`snapshot.companyType = entityConfig?.companyType` writes `undefined` when `entityConfig` is null (sole prop or missing entity map entry). No validation catches this.

**Fix:** Early return with error if `!entityConfig`.

### UA-5: Income Profile Store Index Collision on Individual Delete (MEDIUM)

**Files:** `AddApplicantPersonal.svelte:401-418`, `AddApplicantBusiness.svelte:731-745`

When deleting an individual, the shift-down loop moves profiles from index `i` to `i-1`. But Company applicants sit at index 0 (prepended). Shifting individual at index 1 to index 0 overwrites the Company slot. Data corruption for business/professional loans with Company + multiple individuals.

**Fix:** Use applicant IDs rather than positional indices, or filter the shift loop.

### UA-6: GPA Single-Mode `$state` Write Inside `$effect` Without `untrack` (MEDIUM)

**File:** `src/lib/components/GPAOfNriApplicant.svelte:227-263`

`editingId = entry.id` is a `$state` write inside an `$effect` body without `untrack`, which can cause re-trigger loops. The `gpaEntries` write uses `untrack` but `editingId` does not — inconsistent and risky.

### UA-7: Unused Imports Across All Three Add Applicant Components (LOW)

- `AddApplicantPersonal.svelte`: unused `jsonLogic` import (pulls entire json-logic bundle)
- All three components: unused `matchesByName` import

### UA-8: `RelationShip.svelte` `isNextEnabled` Not Reset on 1→2+ Person Transition (LOW)

**File:** `src/lib/components/RelationShip.svelte:62-66`

When `allPersons.length <= 1`, `isNextEnabled = true`. But no `else` branch resets it to `false` when count goes back to 2+. Brief window where Next is enabled with incomplete relationships.

---

## 9. Company Director Architecture — Deep Review

### DIR-1: `areAllTabsComplete` Always Blocks Company Applicants (CRITICAL)

**File:** `src/lib/utils/incomeTabState.ts:254-262`

`areAllTabsComplete` checks `completion.income_details` and `completion.income_profiles`, but `buildCompanyIncomeTabs` never includes these tabs for Company applicants. A Company can never satisfy the completion gate, blocking progression.

**Fix:** Add a separate `areAllCompanyTabsComplete` that only checks `business_profile`, `profile`, `credit_score` (+ optional `obligations_details`).

### DIR-2: `isApplicantNRI` Type Mismatch — String vs Boolean (CRITICAL)

**File:** `src/lib/components/DirectorCards.svelte:388,449`

Director-linked Individuals are written with `isApplicantNRI: d.isNRI` (string `'Yes'`/`'No'`), but the `Applicant` type declares `isApplicantNRI?: boolean`. Code testing `applicant.isApplicantNRI === true` silently fails for director-linked individuals.

**Fix:** Normalize to boolean when writing, or update the type to `'Yes' | 'No' | boolean`.

### DIR-3: `isGuarantor` Incorrectly Set for Co-Applicant Directors (CRITICAL)

**File:** `src/lib/components/DirectorCards.svelte:391,452`

```typescript
isGuarantor: d.isCoApplicant ? 'Yes' : 'No';
```

Co-applicant directors are not guarantors — these are mutually exclusive categories. This corrupts the payload for rule engine and bank eligibility.

**Fix:** Set `isGuarantor: 'No'` for all director-linked Individuals. Only set via explicit UI choice.

### DIR-4: Relationship IDs Can Collide in Tight Loops (MEDIUM)

**File:** `src/lib/utils/restoreRelationships.ts:170-195`

IDs use `Date.now()` which has 1ms resolution. Multiple loop iterations within 1ms produce duplicate IDs.

**Fix:** Use `crypto.randomUUID()` or `uuidv4()`.

### DIR-5: Duplicate Force-Through Corrupts `fullName` (MEDIUM)

**File:** `src/lib/components/DirectorCards.svelte:658-664`

On duplicate force-through, name is mutated to `"Rajan Shah_director02"`. This code-style suffix persists in formState, rule engine payload, and PDFs.

**Fix:** Use a separate `disambiguationSuffix` field; keep `fullName` clean.

### DIR-6: `findByIdentity` Drops Matches When `applicantType` Is Undefined (MEDIUM)

**File:** `src/lib/utils/restoreRelationships.ts:217`

If `identity.applicantType` is `undefined`, `a.applicantType !== undefined` is always `true` for typed applicants — no match found, relationship silently dropped.

**Fix:** Skip the type filter when `identity.applicantType` is undefined.

### DIR-7: `editCard` Auto-Confirms Without Duplicate Check (MEDIUM)

**File:** `src/lib/components/DirectorCards.svelte:696-704`

`editCard` only checks `isCardComplete`, not `validateSingleCard`. Cards with identical details bypass the deduplication guard.

### DIR-8: Ownership Total Only Validated at Page Next (LOW)

**File:** `src/lib/components/DirectorCards.svelte:746-751`

Combined ownership >100% is only caught at `validateStep` (page Next), but cards are already synced to formState individually. Rule engine could receive >100% ownership data.

### DIR-9: Single-Director `familyStakePercent` Reports 0% (LOW)

**File:** `src/lib/utils/familyControlDerivation.ts:116-128`

Default result sets `familyStakePercent: 0` for single-director companies instead of reading `directors[0].ownershipPercent`. Downstream code would see 0% stake for a sole director.

---

## Revised Action Items

| #   | Priority     | Action                                                                                                  | File(s)                                     |
| --- | ------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | **CRITICAL** | Fix `jl.notInArr` — `'!in'` is not a valid json-logic-js operator, validation silently fails            | `jsonLogicHelpers.ts`                       |
| 2   | **CRITICAL** | Fix `SHOW_WHEN_PROPERTY_LOCATION` — shows page when `propertyIdentified == "No"` (should be "Yes" only) | `homeLoan/pages.ts`                         |
| 3   | **CRITICAL** | Validate `answers` map (type, keys no `$`/`.`, size limit) + `pageIndex` as non-negative int            | `evaluate/+server.ts`, `options/+server.ts` |
| 4   | **CRITICAL** | Fix `areAllTabsComplete` — Company applicants blocked (checks tabs that don't exist)                    | `incomeTabState.ts`                         |
| 5   | **CRITICAL** | Fix `isGuarantor` — co-applicant directors wrongly marked as guarantors                                 | `DirectorCards.svelte`                      |
| 6   | **CRITICAL** | Fix `isApplicantNRI` type mismatch — string vs boolean for director Individuals                         | `DirectorCards.svelte`                      |
| 7   | **CRITICAL** | Fix `navigatePrevious()` — guard `step0SubView` check with `currentView`                                | `ApplicantFormUnsecured.svelte`             |
| 8   | **CRITICAL** | Fix `lastEntityType` — use `$state` to survive remount                                                  | `AddApplicantBusiness.svelte`               |
| 9   | **HIGH**     | Swap ContradictionWarningModal button styles (destructive should not be dominant)                       | `ContradictionWarningModal.svelte`          |
| 10  | **HIGH**     | Fail-closed on showWhen decode failure                                                                  | `showWhenDecoder.ts`                        |
| 11  | **HIGH**     | Remove literal password from vite.config.ts reminder                                                    | `vite.config.ts`                            |
| 12  | **HIGH**     | Validate `loanType` against allowlist before `createFormEngine()`                                       | `evaluate/+server.ts`, `options/+server.ts` |
| 13  | **MEDIUM**   | Fix duplicate force-through `fullName` corruption (`_director02` suffix)                                | `DirectorCards.svelte`                      |
| 14  | **MEDIUM**   | Fix `findByIdentity` — silently drops when `applicantType` is undefined                                 | `restoreRelationships.ts`                   |
| 15  | **MEDIUM**   | Fix relationship ID collisions from `Date.now()` in tight loops                                         | `restoreRelationships.ts`                   |
| 16  | **MEDIUM**   | Fix `editCard` auto-confirm bypasses duplicate check                                                    | `DirectorCards.svelte`                      |
| 17  | **MEDIUM**   | Guard `saveCompany()` against null `entityConfig`                                                       | `AddApplicantBusiness.svelte`               |
| 18  | **MEDIUM**   | Fix income profile store index collision on individual delete                                           | `AddApplicantPersonal/Business.svelte`      |
| 19  | **MEDIUM**   | Fix GPA `$state` write inside `$effect`                                                                 | `GPAOfNriApplicant.svelte`                  |
| 20  | **MEDIUM**   | Fix rate limiter off-by-one (`>` → `>=`)                                                                | `formGuard.ts`                              |
| 21  | **MEDIUM**   | Generic error messages in production API responses                                                      | `evaluate/+server.ts`, `options/+server.ts` |
| 22  | **MEDIUM**   | Lazy schema composition + structuredClone + deduplicate LAP alias                                       | `schemaLoader.ts`                           |
| 23  | **LOW**      | Fix single-director `familyStakePercent` = 0                                                            | `familyControlDerivation.ts`                |
| 24  | **LOW**      | Fix Plot Loan lowercase page title `'existing details'`                                                 | `plotLoan/pages.ts`                         |
| 25  | **LOW**      | Ownership total only validated at page Next, not per-card                                               | `DirectorCards.svelte`                      |
| 26  | **LOW**      | Fix btoa spread for large showWhen                                                                      | `engine.ts`                                 |
| 27  | **LOW**      | Skip shuffle for layoutGroup pages                                                                      | `engine.ts`                                 |
| 28  | **LOW**      | Remove unused imports (jsonLogic, matchesByName)                                                        | `AddApplicant*.svelte`                      |
| 29  | **LOW**      | Add `else` branch to RelationShip isNextEnabled                                                         | `RelationShip.svelte`                       |
| 30  | **HYGIENE**  | Delete/archive stale root scripts                                                                       | `analyze-schemas.*`, `find-pages.cjs`       |

---

_Review generated 2026-03-15 by automated daily code review._
