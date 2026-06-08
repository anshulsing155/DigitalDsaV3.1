# Code Review — 2026-04-23

**Scope**: 30 commits since last review (2026-04-12), covering `970af1be..4be2057d`
**Reviewer**: Automated daily review (Claude Code)
**Focus**: Security, bugs, UX issues, codebase alignment

---

## Commits Reviewed (non-trivial)

| Commit | Description | Risk |
|--------|-------------|------|
| `93fd3a15` | QA scenario system (Phases 1-5) — 2,671 insertions | HIGH |
| `bb116aa7` | Suggest primary applicant banner (374 lines) | MEDIUM |
| `67b5b873` | Move QA-save button inline next to Submit | LOW |
| `32ca6949` | PL bridge rate — per-lender merged policy | LOW |
| `df156558` | Director effect loop fix (Pvt Ltd designation) | LOW |
| `4be2057d` | isLastPage guard against stale visiblePages | LOW |
| `61ea014d` | Capacitor Android platform init | LOW |
| `1d8a39f4` | Capacitor build scripts in package.json | LOW |
| `58bf8d20` | Remove invalid `objectId` export from QA route | LOW |
| `abaf0d12` | CSRF client unified — archive csrfClient.ts | LOW |
| ~18 commits | Testing/docs (S77e Step 4 journeys, snapshots, linting) | TRIVIAL |

---

## Findings

### S1 — SECURITY: QA endpoints bypass CSRF (HIGH)

**Files**: `src/routes/dashboard/admin/qa/+page.svelte`, `src/routes/dashboard/admin/qa/[id]/+page.svelte`, `src/lib/components/form-wizard/FormShell.svelte`

All client-side `fetch()` calls in the new QA system use raw `fetch()` instead of `secureFetch()`. The project unified CSRF handling in commit `abaf0d12` — every mutating API call should go through `secureFetch` to include the HMAC CSRF token.

**Affected calls** (5 total):
- `FormShell.svelte:170` — `POST /api/qa/scenarios` (save scenario)
- `+page.svelte:79` — `POST /api/qa/scenarios/run` (run single)
- `+page.svelte:105` — `POST /api/qa/scenarios/run` (run all)
- `+page.svelte:135` — `POST /api/qa/scenarios/[id]/clone`
- `+page.svelte:161` — `DELETE /api/qa/scenarios/[id]`

**Impact**: These POST/DELETE calls will fail in production if CSRF enforcement is active, or if CSRF is not enforced on these routes, they become an inconsistency that weakens the CSRF model.

**Fix**: Replace all 5 `fetch()` calls with `secureFetch()` from `$lib/utils/csrf`.

---

### S2 — SECURITY: Unbounded parallel scenario execution (MEDIUM)

**File**: `src/routes/api/qa/scenarios/run/+server.ts:62-64`

```typescript
const results = await Promise.all(
    scenarios.map((scenario) => runSingleScenario(scenario))
);
```

When `ids: []` is passed, ALL non-archived scenarios are loaded and run in parallel with no concurrency limit. Each `runSingleScenario` calls `buildLoanPayload()` + `evaluatePayload()` (which hits MongoDB for policy resolution). With hundreds of scenarios, this could exhaust server memory/connections.

**Fix**: Add a concurrency limiter (e.g., batch in groups of 10) or cap `ids: []` to a reasonable maximum (e.g., 50).

---

### B1 — BUG RISK: Applicant reorder may break dependent state (MEDIUM)

**Files**: `AddApplicant.svelte`, `AddApplicantPersonal.svelte`, `AddApplicantBusiness.svelte`

The `handleSetPrimary()` function reorders `formState.applicants` so a co-applicant becomes index 0. However, several systems are index-dependent:
- Income entries may reference applicant by index
- `userRelationships` store uses `fromId`/`toId` which may be index-based
- The rule engine uses `applicants[0]` for age-at-maturity, CIBIL display
- Any in-progress form edits on the income/obligation pages may reference stale indices

This is an advisory feature, so the risk is mitigated by user choice, but a reorder mid-form-fill could cause silent data misattribution.

**Recommendation**: Verify that `replaceApplicants()` updates all index-dependent references, or add a confirmation dialog warning the user about consequences.

---

### C1 — CODE QUALITY: `extractMeta()` duplicated (LOW)

**Files**: `src/routes/api/qa/scenarios/+server.ts:123-157`, `src/routes/api/qa/scenarios/[id]/clone/+server.ts:94-125`

Identical `extractMeta()` function copied into both files. When one is updated, the other will drift.

**Fix**: Extract to `$lib/testing/deriveFixtureName.ts` or a new `$lib/testing/qaHelpers.ts`.

---

### C2 — CODE QUALITY: `handleSetPrimary()` duplicated 3x (LOW)

**Files**: `AddApplicant.svelte`, `AddApplicantPersonal.svelte`, `AddApplicantBusiness.svelte`

Identical 8-line function in all three files. Should be a shared utility in `formState` or a helper module.

---

### C3 — CODE QUALITY: `toObjectId()` duplicated 3x (LOW)

**Files**: `+server.ts` (as `objectId`), `[id]/+server.ts`, `[id]/clone/+server.ts`

Same one-liner helper in three files. Extract to a shared module.

---

### C4 — CODE QUALITY: QA admin page imports from `lucide-svelte` directly (LOW)

**File**: `src/routes/dashboard/admin/qa/+page.svelte:11-20`

The QA admin page imports icons directly from `lucide-svelte` instead of `$lib/utils/iconRegistry`. The detail page (`[id]/+page.svelte`) likely does the same. This bypasses the project's icon tree-shaking strategy and is inconsistent with every other component.

---

### C5 — CODE QUALITY: Legacy `get()` import in FormShell (LOW)

**File**: `src/lib/components/form-wizard/FormShell.svelte`

```typescript
import { get } from 'svelte/store';
// ...
const relationships = get(userRelationships).map(...)
```

`userRelationships` is still a legacy Svelte store. The `get()` call works but is inconsistent with the Svelte 5 runes pattern used everywhere else in this file. Future sessions should migrate `relationshipStore` to runes.

---

### I1 — INFO: Android manifest is minimal (OK)

**File**: `android/app/src/main/AndroidManifest.xml`

Only `INTERNET` permission requested. `allowBackup="true"` is the Capacitor default — consider setting to `false` before Play Store submission to prevent backup of app data (which could include auth tokens in WebView storage).

---

### I2 — INFO: isLastPage + isSingleApplicant effect (OK)

**Files**: All 6 form pages (`home-loan`, `lap`, `plot-loan`, `personal-loan`, `business-loan`, `professional-loan`)

The fix correctly guards `isLastPage` with `!evaluating` and triggers re-evaluation when applicant count changes. The `untrack()` on `currentPageIndex` is correct to avoid reactive dependency cycles. No issues found.

---

### I3 — INFO: Director effect loop fix (OK)

**File**: `src/lib/components/DirectorFormModal.svelte`

Both fixes are correct: the no-op guard (`if (form[field] === value) return`) and the empty-string guard (`if (current && !allowed.includes(current))`) properly break the infinite `$effect` loop. Clean fix.

---

### I4 — INFO: PL bridge rate fix (OK)

**File**: `src/lib/ruleEngine/evaluationEngine.ts`

Correctly layers `applyOverride()` on top of `getCategoryDefaults()` so per-lender PL rates (e.g., SBI 13.5% vs HDFC 16.0%) are used instead of the generic category bucket. The fallback when no override exists is correct.

---

## Summary

| Severity | Count | Items |
|----------|-------|-------|
| HIGH | 1 | S1 (CSRF bypass on QA endpoints) |
| MEDIUM | 2 | S2 (unbounded parallel run), B1 (applicant reorder risk) |
| LOW | 5 | C1-C5 (code duplication, icon imports, legacy store) |
| INFO | 4 | I1-I4 (no action needed) |

### Recommended Priority

1. **S1** — Replace all 5 raw `fetch()` calls with `secureFetch()` in QA pages + FormShell (~15 min)
2. **S2** — Add concurrency limit to QA run-all endpoint (~10 min)
3. **B1** — Add integration test or confirmation dialog for applicant reorder (~30 min)
4. **C1-C3** — Deduplicate `extractMeta`, `handleSetPrimary`, `toObjectId` (~20 min)
5. **C4** — Switch QA admin pages to `iconRegistry` imports (~10 min)
