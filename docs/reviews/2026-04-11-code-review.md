# Code Review — Session 72 (2026-04-11)

**Scope**: 28 commits (`fed82bf0..a53ab3ab`) — classification overhaul, variationMatcher, affordability wiring, PL selector, obligation tests, deprecated export cleanup  
**Author**: Prashant (all commits)  
**Reviewer**: Automated daily review  

---

## HIGH

### H1. Name-based cross-company matching is fragile
**File**: `applicantFormManager.svelte.ts` ~line 1493-1513

`recomputeClassification` matches Individual applicants to director slots by **name only** (no ID tiebreaker). If two unrelated people share a name (e.g., "Raj Kumar"), the Individual will be incorrectly classified as if they were a director in that company. This changes income tabs, pooling, and lender evaluation.

The guard `if (linkedCompanyId || applicantName)` is too broad — a standalone Individual with no `linkedCompanyId` but a common name will still search all company director lists.

**Recommendation**: Use `linkedCompanyId` as primary match. Fall back to name only when `linkedCompanyId` is unset AND the person was explicitly added as a director.

### H2. `changed` flag not reset per-company in onEMI/onProperty sync
**File**: `applicantFormManager.svelte.ts` ~line 1648-1669

The `changed` boolean persists across the company iteration loop. Once set `true` for Company A, all subsequent companies get their directors array replaced with an identical copy, triggering unnecessary reactive updates. Same issue for `formsChanged` at ~line 1677.

**Fix**: Reset `changed = false` at the start of each company iteration.

---

## MEDIUM

### M1. `isSalaried` / `isGovernment` convenience flags compare wrong strings
**File**: `variationMatcher.ts` lines 63-64

```ts
isSalaried: primaryEmploymentType === 'Salaried',       // WRONG
isGovernment: primaryEmploymentType === 'Government',    // WRONG
```

Actual system values are `'Salaried(Private)'` and `'Salaried(Government)'`. These flags are **always false**. Currently harmless if conditions use the raw `employmentType` field, but misleading and will silently break any condition relying on them.

### M2. `Self-employed(Businessman)` missing from PL selector scoring
**File**: `plApplicantSelector.ts` lines 133-138

`EMPLOYMENT_SCORES` maps Salaried and Self-employed(Professional/Other) but omits `Self-employed(Businessman)`, giving them the default 0.5 instead of 0.7. This unfairly penalizes Businessman applicants in PL assignment scoring.

### M3. `classificationOverride` remnants after DSA override removal
**Files**: `applicantFormManager.svelte.ts` line 1637, `form.ts`, `payloadBuilder/types.ts`

The DSA override UI and logic were removed, but `classificationOverride` remains in the trigger list and type definitions. Dead code that could confuse maintainers.

### M4. `$effect` recomputes ALL applicants on every reactive trigger
**File**: `applicantFormManager.svelte.ts` ~line 1570-1597

The classification `$effect` iterates every applicant on every trigger (including page index changes). Each iteration does O(M * D) work. Fine for typical 2-5 applicants, but could lag with 10+ applicants across multiple companies. Consider gating on actual data changes rather than step transitions.

### M5. Family stake scope mismatch with name-based matching
**File**: `applicantFormManager.svelte.ts` ~line 1458-1473

`classifyForCompany` looks up siblings via `linkedCompanyId`, but the calling function matches by name across all companies. A person matched to a company by name (not `linkedCompanyId`) may have family members missed by the sibling lookup.

### M6. JSON-Logic depth/complexity is unbounded
**File**: `variationMatcher.ts` line 116

`jsonLogic.apply(variation.match_condition, flatContext)` has try/catch for crashes but no protection against pathologically complex rules causing CPU exhaustion. Low risk since only admin-authored data enters DB.

---

## LOW

### L1. PL selector: Age 0 produces confusing rejection message
**File**: `plApplicantSelector.ts` line 276 — "Age 0 below minimum 21" when age is missing, not actually zero.

### L2. PL selector: `isNonEarning === true` misses string `"Yes"`
**File**: `plApplicantSelector.ts` line 262 — Form data may contain string-typed booleans.

### L3. Redundant ternary in onEMI/onProperty sync
**File**: `applicantFormManager.svelte.ts` ~line 1657-1659 — Both branches identical.

### L4. Badge color classes duplicated 4x in template
**File**: `ApplicantSummaryTable.svelte` — Same color-class mapping in 4 locations. Extract to helper.

### L5. `_forceReactivity = JSON.stringify(sectionCompletion)` in IncomePageNew
**File**: `IncomePageNew.svelte` ~line 647 — Svelte 5 fine-grained reactivity should make this unnecessary. Worth investigating.

---

## Architecture Compliance: PASS

- Server-side classification re-derived per-lender in evaluation engine (correct separation)
- Immutable patterns: spread operators, `replaceApplicants()`, no mutation
- No new PII exposure paths
- All new server code uses `logger` (Pino), not `console`
- Error handling: every new function has try/catch with graceful fallbacks
- Currency rounding: `Math.round()` used consistently
- FOIR units (decimal) consistent between evaluation and affordability

---

## Positive Patterns

- Classification overhaul is well-structured: derive → sync → display, with clear separation
- 164 new tests across obligation logic (126), PL selector (24), and classification reactivity (9)
- Deprecated export removal is clean (-344 lines, no dangling refs)
- Affordability calculator gracefully returns `null` per-mode on failure

---

## Action Items (Priority Order)

1. **Fix M1** — variationMatcher employment type strings (5 min)
2. **Fix M2** — Add Businessman to PL scoring table (2 min)
3. **Fix H2** — Reset `changed` flag per-company (5 min)
4. **Evaluate H1** — Decide if name-only matching is acceptable given the user base (likely yes for v1, but add a TODO)
5. **Clean M3** — Remove `classificationOverride` remnants (10 min)
