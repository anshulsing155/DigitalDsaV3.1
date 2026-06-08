# Daily Code Review — 2026-04-28 (Evening Run)

**Scope:** 6 commits since the morning review (`23904e7f`): `fc77ce1d`, `bb84f89b`, `82e60819`, `d2e0ac2e`, `bbae3a0e`, `b5f3343a`. All by Prashant (tech@eyantrik.com / tech@digitaldsa.com). No teammate commits in this window.

**Standing grep rules (Rules A–D):** All 4 executed plus Pitfall #9 re-sweep and new `typeof localStorage|document` variant scan. Rules B, D clean (0 matches). Rule A: same known-safe inventory. Rule C: same 10 acceptable instances. Pitfall #9 (`typeof window !== 'undefined'`): 0 matches — fully eradicated. New variant: 1 live instance of `typeof document !== 'undefined'` in [`behaviorTelemetry.ts:113`](src/lib/utils/behaviorTelemetry.ts:113) (low risk — guarded by `this.attached` flag, see L-NEW-2).

---

## Commits Reviewed

| Commit | Subject | Verdict |
|--------|---------|---------|
| `fc77ce1d` | fix(pms): close Critical #5 — Zod input validation in engine adapter | **RESOLVED — exemplary** |
| `bb84f89b` | fix: close remaining medium findings from 2026-04-26 daily review | **Clean — 3 medium findings closed** |
| `82e60819` | fix(business-loan): clean up applicant flow — entity badge, designation default, income lock | **1 New Medium** |
| `d2e0ac2e` | fix: close Batch A audit findings (zero-risk mechanical fixes) | **Clean — good mechanical hardening** |
| `bbae3a0e` | docs: dashboard-wiring plan + 3 health-check entries appended to 2026-04-25 review | **Docs only — no code** |
| `b5f3343a` | fix: close Batch B audit findings (SSR guard + boundaries + CRM safety) | **1 New Medium, 1 New Low** |

---

## Critical #5 — RESOLVED (6th Review, Final)

**The longest-standing Critical in the project is now closed.**

[`pmsToEngineAdapter.ts:714-824`](src/lib/server/pms/pmsToEngineAdapter.ts:714) — `validateAdapterInput()` is called at entry of `pmsToEnginePolicy()` (line 842), before any arithmetic. Implementation details:

- **Schema coverage**: All 8 sections the adapter reads — eligibility, income, foir, ltv (nullable for unsecured), obligations, tenure, roi, fees
- **Range bounds** are tight and well-reasoned:
  - Percentages: 0–100 (FOIR, haircuts, LTV, fees)
  - CIBIL: 300–900 (real bureau range)
  - Age: 18–100 (legal contract age to defensive upper bound)
  - Tenure: 1–360 months (PL minimum to 30-year HL)
  - ROI: 0–50% (covers all real Indian lending products)
  - LTV tiers: `upTo` must be positive; `maxLtv` must be valid percent
- **Enum validation**: `creditCardFoirMethod` restricted to `'utilization' | 'limit_percentage' | 'full_limit'`
- **Error messages**: Include `lenderId/loanProduct` + specific field path for operator triage
- **Multi-issue reporting**: Zod surfaces ALL failing fields in one throw, not just the first

**Tests** ([`pmsToEngineAdapter.test.ts`](src/lib/testing/__tests__/pms/pmsToEngineAdapter.test.ts)): 28 test cases across 10 `describe` blocks covering:
- Type drift (string "50" instead of number 50) — the canonical NaN-cascade trap
- NaN, Infinity edge cases
- Range boundary violations (negative, over-100%, over-50% ROI, over-360 tenure)
- Nullable field handling (LTV null for unsecured)
- Enum validation (unknown `creditCardFoirMethod`)
- Multi-issue aggregation in error message
- Baseline fixture passes validation (no false positives)
- All existing adapter sections: identity, eligibility, CIBIL, FOIR, income, LTV, tenure, ROI, fees, geo, obligations, overrides, display policies

**Verdict:** Comprehensive and correct. The `PercentField`/`NonNegativeField` reusable building blocks are a good pattern. No concerns.

---

## Prior Finding Resolution

### From Morning Review (2026-04-28)

| # | Finding | Status | Commit |
|---|---------|--------|--------|
| C5 | Missing Zod validation in PMS adapter | **RESOLVED** | `fc77ce1d` |
| M1 | JSON Editor per-keystroke double-parse | **RESOLVED** | `bb84f89b` |
| M4 | Suggestion `dsaNote` wrapped in literal `"..."` | **RESOLVED** | `bb84f89b` |
| M5 | Dead `countChangelogEntries()` function | **RESOLVED** | `bb84f89b` |
| L1 | `schemaUtils.ts` raw `fetch` POST + bare `console.error` | **RESOLVED** | `bb84f89b` (functions deleted) |
| L-NEW-1 | CI `scanFormBindsTos()` hardcodes JSON file list | Still open | — |
| M-NEW-1 | `coerceValueField()` silently nullifies complex values | Still open | — |

### Batch A Fixes (`d2e0ac2e`)

All zero-risk mechanical fixes, no concerns:

- **`robots.txt`**: Fixed SvelteKit route group misconception — `/(auth)/` and `/(app)/` are NOT URL segments. Now disallows real paths (`/login`, `/partner-signup`, `/form/`, `/evaluating`). Correct.
- **`verify-otp/+server.ts`**: PII masking in logs — mobile number masked to last 4 digits. DPDP Act compliance. Correct.
- **`errorAlert.ts`**: `ALERT_RECIPIENT` now configurable via `env.ALERT_RECIPIENT_EMAIL` with fallback. Correct.
- **`+page.svelte`**: Added `<link rel="canonical">` and `og:url`. Correct SEO.
- **`app.css`**: Added unprefixed `mask` alongside `-webkit-mask`. Correct cross-browser.
- **`TextField.svelte`**: Uncommented error display, added `!error` guard to prevent double-display. Correct.
- **`vite.config.ts`**: Redacted plaintext SMTP credential (`Password@123`) from prelaunch reminder string. Cosmetic — credential is still in git history (PB-7/PB-8 covers the real fix).

### Batch B Fixes (`b5f3343a`)

- **`NotificationBell.svelte`**: `mounted` flag guards async state updates after unmount. Good pattern — `secureFetch` doesn't accept `AbortSignal`, so the flag prevents stale updates.
- **`theme.svelte.ts`**: `typeof localStorage !== 'undefined'` → `browser` from `$app/environment`. Correct Pitfall #9 variant fix.
- **`(app)/+layout.svelte` + `dashboard/+layout.svelte`**: Wrapped children in `ErrorBoundary`. New crash protection layer for both layout trees. Good defensive measure.

---

## New Findings

### Medium #1 — CRM page 5000-case limit with no user indicator (confidence: 80)

**File:** [`dsa/crm/+page.server.ts:208-235`](src/routes/dashboard/dsa/crm/+page.server.ts:208)

**Commit:** `b5f3343a`

The CRM `load` function now caps at `CASE_FETCH_LIMIT = 5000` cases with `sort({ created_at: -1 }).limit(5000)`. This is a good defensive measure against heap pressure. However, if a power user has >5000 cases, they'll only see the most recent 5000 with no indication that older cases are hidden.

**Recommended fix:** Return `{ cases: allCases, caseLimitReached: allCases.length === CASE_FETCH_LIMIT }` from the load function, and render a notice banner when `caseLimitReached` is true: "Showing your 5,000 most recent cases. Use filters to find older cases."

**Impact:** Low — typical DSAs have <500 cases per the comment. But the absence of feedback violates the "no silent data loss" UX principle.

### Medium #2 — Sole proprietor auto-save `$effect` triggers on every keystroke (confidence: 70)

**File:** [`AddApplicantBusiness.svelte:252-283`](src/lib/components/AddApplicantBusiness.svelte:252)

**Commit:** `82e60819`

The `$effect` that auto-saves the sole proprietor to `formState.applicants` tracks `formApplicant.fullName`, `gender`, `age`, `maritalStatus`, and `isNRI`. Every character typed in `fullName` re-evaluates the effect, calls `getIndividualErrors()` for validation, and builds the dedup key. While the dedup key check prevents redundant `replaceApplicants()` calls, the error computation on every tick could cause micro-stuttering on lower-end Android devices (Capacitor target).

**Mitigation already in place:** The key comparison returns early before `replaceApplicants()` when nothing changed, so the expensive operation (snapshot + replace) only runs on meaningful transitions. The `getIndividualErrors()` call is the remaining per-tick cost.

**Recommended fix:** Debounce the effect, or move the fullName tracking to blur rather than reactive change. Not blocking — note for perf profiling if field lag is reported.

### Low #1 — `typeof document !== 'undefined'` variant of Pitfall #9 (confidence: 65)

**File:** [`behaviorTelemetry.ts:113`](src/lib/utils/behaviorTelemetry.ts:113)

In Vite 7 SSR, `document` may be partially exposed (same as `window`/`localStorage`). The guard `typeof document !== 'undefined'` could pass during SSR while `document.removeEventListener` is undefined.

**Mitigating factor:** The code is additionally guarded by `this.attached`, which is only set `true` in client-side `attach()` calls. So in practice, this block never executes during SSR.

**Recommended fix:** Replace with `if (this.attached && browser)` for consistency with the Pitfall #9 standard.

### Low #2 — `schemaUtils.ts` is now just a type export (confidence: 90)

**File:** [`schemaUtils.ts`](src/lib/utils/schemaUtils.ts)

After `bb84f89b` deleted 95 lines of raw-fetch functions, the file now only exports a `SchemaItem` interface (3 lines). The filename `schemaUtils` is misleading for a file that's purely a type definition. Consider moving the interface to a types file and deleting the utility file, or at minimum renaming it.

**Import site:** [`src/lib/form/firstPage/schema.ts:39`](src/lib/form/firstPage/schema.ts:39) — `preprocessSchemaBindings` is still imported. *(Wait — let me verify this function still exists...)*

**Correction:** `preprocessSchemaBindings` is still exported from `schemaUtils.ts` — the deletion only removed the `uploadSchema`, `getSchema`, and `listSchemas` functions. The file still contains `preprocessSchemaBindings` and `SchemaItem`. The "nearly empty" assessment was wrong — the remaining code is functional, not just a type. **Downgrading to Info — no action needed.**

---

## Carry-Forward Findings (Open)

### Critical: 0

**This is the first time the project has zero open Criticals.** C5 (Zod adapter validation) was open for 6 consecutive reviews and is now comprehensively resolved.

### Medium (7 remaining)

| # | Finding | File |
|---|---------|------|
| M8 | CIBIL floor applied twice for PMS docs | PMS adapter |
| M9 | In-memory rate limiter `MAX_WINDOW_MS = 10min` < OTP verify `windowMs = 15min` | [`rateLimiter.ts:14`](src/lib/server/rateLimiter.ts:14) |
| M10 | Partial-resolve duplicate PendingChange records | PMS service |
| M11 | JSON-Logic `override.condition` no depth/structure validation | PMS adapter |
| M-NEW-1 | `coerceValueField()` silently nullifies complex values | [`suggestions/+server.ts:21`](src/routes/api/pms/suggestions/+server.ts:21) |
| M-NEW-2 | CRM 5000-case limit with no UI indicator | [`crm/+page.server.ts:208`](src/routes/dashboard/dsa/crm/+page.server.ts:208) |
| M-NEW-3 | Sole prop auto-save per-keystroke overhead | [`AddApplicantBusiness.svelte:252`](src/lib/components/AddApplicantBusiness.svelte:252) |

### Low (3 remaining)

| # | Finding | File |
|---|---------|------|
| L2 | Teammate mixed quote styles in JSON-Logic array | [`propertyCondition.ts:193`](src/lib/config/homeLoan/questionBank/propertyCondition.ts:193) |
| L-NEW-1 | CI `scanFormBindsTos()` hardcodes JSON file list | [`check-registry-integrity.cjs:156`](scripts/check-registry-integrity.cjs:156) |
| L-NEW-2 | `typeof document` Pitfall #9 variant in behaviorTelemetry | [`behaviorTelemetry.ts:113`](src/lib/utils/behaviorTelemetry.ts:113) |

---

## Standing Grep Sweep Summary

| Rule | Pattern | Matches | Status |
|------|---------|---------|--------|
| A — raw `fetch` on mutating `.svelte` | `await fetch(` | 43 | All known-safe (auth pre-session, GET, archived). No new mutating endpoints. |
| B — static `@capacitor/*` imports | `^import .* from @capacitor/` | **0** | Clean |
| C — `window.location.reload()` | literal | 10 | All acceptable (error pages, admin seeding, LanguageSelector, ResetDataButton, ErrorBoundary) |
| D — async return of Capacitor proxy | `return (mod\|module\|m).\w+` | **0** | Clean |
| Pitfall #9 — broken SSR guard | `typeof window !== 'undefined'` | **0** | Fully eradicated |
| **NEW** — Pitfall #9 variant | `typeof (localStorage\|document) !== 'undefined'` | 1 live + 1 comment + 2 test | 1 live in `behaviorTelemetry.ts` (guarded by `this.attached`) |

---

## Summary

| Severity | New (this run) | Resolved (this run) | Carry-Forward | Total Open |
|----------|----------------|---------------------|---------------|------------|
| Critical | 0 | **1** (C5 — 6-review streak) | 0 | **0** |
| Medium | 2 | **4** (M1, M4, M5, C5→M→resolved) | 7 | **9** |
| Low | 1 (downgraded from 2) | **1** (L1) | 3 | **4** |

**Milestone: Zero open Criticals for the first time.** The C5 Zod validation fix is the most impactful single commit this review cycle — 28 tests, comprehensive range bounds, and it closes the NaN-cascade attack vector that could have silently produced wrong eligibility results.

**Net across both 2026-04-28 runs:** 6 Criticals resolved, 7 Highs resolved, 8 Mediums resolved. The open backlog is now entirely Medium/Low code quality items — no security or correctness issues above Medium confidence.

---

## Top 3 Actions for Next Session

1. **Add Pitfall #9 variant to standing grep rules.** Add a Rule E checking `typeof (localStorage|document|navigator|sessionStorage) !== 'undefined'` in `src/**/*.{ts,svelte}`. The `behaviorTelemetry.ts` instance is low-risk but the pattern should be caught systematically.

2. **CRM limit indicator.** Add `caseLimitReached` flag to the CRM load return and render a notice when the 5000-case cap is hit. 15-minute fix.

3. **Fix `coerceValueField()` silent nullification** (carried from morning review). Return 400 for non-scalar suggestion inputs. 10-minute fix.
