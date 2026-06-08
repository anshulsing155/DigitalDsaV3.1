# Daily Code Review — 2026-04-28

**Scope:** 1 commit since last review (`9f258c60`, 2026-04-28). This commit is a comprehensive remediation of the 2026-04-27 review's findings — 6 Criticals, 7 Highs, and 4 Medium quick wins addressed. No teammate commits in this window.

**Standing grep rules (Rules A–D):** All 4 executed plus Pitfall #9 re-sweep. Rules B, C, D clean (no new matches). Rule A: same known-safe inventory as 2026-04-27 review. Pitfall #9 (`typeof window !== 'undefined'`): 0 matches — pattern fully eradicated.

---

## Commit Reviewed

| Commit | Author | Subject | Verdict |
|--------|--------|---------|---------|
| `9f258c60` | Prashant | fix: address 2026-04-27 daily code review findings (4-day comprehensive sweep) | **1 New Medium, 1 New Low** — remediation quality is high overall |

---

## Remediation Audit — Prior Review Findings

### Critical #NEW (DC Personal Loan Profile stuck) — RESOLVED

**Fix approach:** Option B from the review (auto-fill unconditionally + route-level propagation).

**Changes verified:**
- [`ApplicantProfilePage.svelte:537-567`](src/lib/components/ApplicantProfilePage.svelte:537): Removed the `if (!anchorState || !anchorCity) return;` early bail-out. Now sets `applicantResidencePattern = 'SAME_CITY'` unconditionally for non-NRI Individuals. State/city sync runs only when anchor data is available.
- [`personal-loan/+page.svelte:300-338`](src/routes/(app)/form/unsecure-loan/personal-loan/+page.svelte:300): Route-level `$effect` propagates `residenceStateName`/`City` to applicant fields when locationPageDC is filled (covers the case where Profile component is unmounted).

**Correctness check:**
- `replaceApplicants()` is well-established on `formState` (20+ call sites in active code)
- Company applicants correctly skipped (`applicantType !== 'Individual'` guard)
- NRI applicants correctly skipped (`isNRI === 'Yes'` guard)
- Fresh flow: redundant-but-idempotent double-write with Profile's own effect (acceptable)
- `mutated` flag prevents unnecessary `replaceApplicants` calls when nothing changed

**Verdict:** Clean fix. DC PL flow should now advance past Profile page.

### Critical #1 (JSON Editor lockVersion) — RESOLVED

**Changes verified:**
- [`policyService.ts:429-441`](src/lib/server/pms/policyService.ts:429): `adminJsonEditPolicy` now accepts `expectedLockVersion?: number`. When provided, loads source policy and compares; throws `PolicyLockConflictError` on mismatch.
- [`admin-json-edit/+server.ts:119-129`](src/routes/api/pms/policies/[id]/admin-json-edit/+server.ts:119): `BodySchema` Zod validates `sections` + `lockVersion: z.number().int().min(0)` — required, not optional. Catch handler returns 409 with user-friendly message.
- Rate limit added (5/min/admin) — also resolves H1.

**Verdict:** Correct. Optimistic lock now enforced on all PMS write paths.

### Critical #2 (Suggestion dedup index) — RESOLVED

**Changes verified:**
- [`mongo.ts:717-742`](src/lib/database/mongo.ts:717): Drops old non-unique index via try-catch, creates new one with `unique: true` + `partialFilterExpression: { fieldPath: { $type: 'string' } }`. The partial filter allows null-fieldPath general suggestions while enforcing field-specific uniqueness.

**Operational note in commit:** Existing duplicate documents in production would block index creation (error 11000). Operators must dedupe before deploying. This is correctly documented but should be tracked as a deployment step.

**Verdict:** Correct.

### Critical #3 (RM suggestion API auth bypass) — RESOLVED

**Changes verified:**
- [`suggestions/+server.ts:56-65`](src/routes/api/pms/suggestions/+server.ts:56): GET endpoint checks `requireRmLenderAccess(locals, lenderId)` for RM role.
- [`suggestions/+server.ts:140-145`](src/routes/api/pms/suggestions/+server.ts:140): POST endpoint checks RM-to-lender assignment.
- [`suggestions/[id]/+server.ts:42-53`](src/routes/api/pms/suggestions/[id]/+server.ts:42): PATCH loads suggestion first to get `lenderId`, then validates RM access. Two DB reads (findOne + updateOne) — acceptable for write-frequency of this endpoint.

**Verdict:** Correct. All three verb handlers now verify RM-to-lender assignment.

### Critical #4 (Registry health checker wrong fields) — RESOLVED

**Changes verified:**
- [`registryIntegrityChecker.ts:128-144`](src/lib/server/pms/registryIntegrityChecker.ts:128): Projection changed from `{ intendedKeyPath: 1, addedAt: 1 }` to `{ proposedKeyPath: 1, createdAt: 1 }`. Loop body updated to read `item.proposedKeyPath`.

**Note:** Still uses `as unknown as { proposedKeyPath?: string | null }` type assertion — suggests the TS type for `PolicyFutureQueue` documents may not include this field. Not a bug, but a type-safety gap.

**Verdict:** Correct. `futureQueueReady` will now populate correctly.

### Critical #5 (Zod validation in pmsToEngineAdapter.ts) — STILL OPEN (5th consecutive review)

[`pmsToEngineAdapter.ts:11`](src/lib/server/pms/pmsToEngineAdapter.ts:11) still references `validateAdapterOutput` which does not exist. No runtime validation on adapter output. Malformed PMS `foir.salaried` stored as string `"50"` silently produces `NaN` from `/100` division.

**This is the longest-standing Critical in the project.** The commit message explicitly notes it as "intentionally deferred — needs a dedicated session."

---

## High Findings — All 7 Resolved

| # | Finding | Fix | Status |
|---|---------|-----|--------|
| H1 | No rate limit on JSON Editor POST | 5/min/admin rate limit added | **Resolved** |
| H2 | No rate limit on suggestion POST | 5/min/user rate limit added | **Resolved** |
| H3 | `lockVersion` not Zod-validated | Now part of `BodySchema` (integer >= 0) | **Resolved** |
| H4 | `currentValue`/`suggestedValue` unbounded | `coerceValueField()` — string-only, 200-char cap | **Resolved** (see New Medium #1) |
| H5 | CI script not wired | `pnpm check:registry` in `package.json` `check` script | **Resolved** |
| H6 | Scanner missed JSON applicant configs | 14 JSON config files now scanned | **Resolved** (see New Medium #2) |
| H7 | `isDefaulter` wrong type/source | `type: 'enum'`, `enumValues: ['Yes','No']`, `source: 'computed'` | **Resolved** |

---

## New Findings in This Commit

### New Medium #1 — `coerceValueField()` silently nullifies complex values (confidence: 75)

**File:** [`suggestions/+server.ts:21-28`](src/routes/api/pms/suggestions/+server.ts:21)

The `coerceValueField` function returns `null` for objects and arrays. This silently replaces the user's submitted value with `null` rather than returning a 400 error explaining why their input was rejected. A DSA submitting `suggestedValue: ["Option A", "Option B"]` would see their suggestion stored with `null` — no feedback, no error.

**Recommended fix:** Return `apiError('suggestedValue must be a string, number, or boolean', 400)` for non-scalar inputs instead of silent coercion. This requires moving the validation to the main handler body (before the MongoDB insert) rather than keeping it as a pure function.

### New Medium #2 — CI script `scanFormBindsTos()` hardcodes 14 JSON filenames (confidence: 85)

**File:** [`scripts/check-registry-integrity.cjs:156-190`](scripts/check-registry-integrity.cjs:156)

The JSON config file list is manually maintained. Adding a new applicant/loan JSON config in the future won't be scanned unless someone remembers to update this list. A glob pattern like `src/lib/config/**/*.json` would be more robust and self-maintaining.

**Risk:** Low-probability but high-impact — a new form key could go unregistered in CI and cause silent PMS mismatches.

---

## Carry-Forward Findings (Open)

### Critical (1 remaining)

| # | Finding | File | Reviews Carried |
|---|---------|------|-----------------|
| C5 | Missing Zod validation in PMS-to-Engine adapter | [`pmsToEngineAdapter.ts:11`](src/lib/server/pms/pmsToEngineAdapter.ts:11) | **5** |

### Medium (8 remaining)

| # | Finding | File |
|---|---------|------|
| M1 | JSON Editor per-keystroke double-parse of original snapshot | [`json-editor/+page.svelte:21`](src/routes/dashboard/admin/policies/pms/[policyId]/json-editor/+page.svelte:21) |
| M4 | Suggestion display: hardcoded `"..."` wraps `dsaNote` | [`suggestions/+page.svelte:172`](src/routes/dashboard/rm/policies/[lenderId]/[product]/suggestions/+page.svelte:172) |
| M5 | CI script `countChangelogEntries()` — dead code | [`scripts/check-registry-integrity.cjs:157`](scripts/check-registry-integrity.cjs:157) |
| M8 | CIBIL floor applied twice for PMS docs | PMS adapter |
| M9 | In-memory rate limiter `MAX_WINDOW_MS = 10min` < OTP verify `windowMs = 15min` | [`rateLimiter.ts:14`](src/lib/server/rateLimiter.ts:14) |
| M10 | Partial-resolve duplicate PendingChange records | PMS service |
| M11 | JSON-Logic `override.condition` no depth/structure validation | PMS adapter |
| M-NEW-1 | `coerceValueField()` silently nullifies complex values | [`suggestions/+server.ts:21`](src/routes/api/pms/suggestions/+server.ts:21) |

### Low (3 remaining)

| # | Finding | File |
|---|---------|------|
| L1 | `schemaUtils.ts` raw `fetch` POST + bare `console.error` (3 sites) | [`schemaUtils.ts:15,33,63,93`](src/lib/utils/schemaUtils.ts:15) |
| L2 | Teammate mixed quote styles in JSON-Logic array | [`propertyCondition.ts:193`](src/lib/config/homeLoan/questionBank/propertyCondition.ts:193) |
| L-NEW-1 | CI `scanFormBindsTos()` hardcodes JSON file list | [`check-registry-integrity.cjs:156`](scripts/check-registry-integrity.cjs:156) |

---

## Standing Grep Sweep Summary

| Rule | Pattern | Matches | Status |
|------|---------|---------|--------|
| A — raw `fetch` on mutating `.svelte` | `await fetch(` | 43 | All known-safe (auth pre-session, GET, archived). No new mutating endpoints. |
| A — raw `fetch` in client `.ts` | `await fetch(` | 24 | Auth services (pre-session), external APIs, csrf.ts itself, schemaUtils.ts (L1 carry). |
| B — static `@capacitor/*` imports | `^import .* from @capacitor/` | **0** | Clean |
| C — `window.location.reload()` | literal | 10 | All acceptable (error pages, admin seeding, LanguageSelector, ResetDataButton, ErrorBoundary) |
| D — async return of Capacitor proxy | `return (mod\|module\|m).\w+` | **0** | Clean |
| Pitfall #9 — broken SSR guard | `typeof window !== 'undefined'` | **0** | Fully eradicated |

---

## Summary

| Severity | New (today) | Resolved (today) | Carry-Forward | Total Open |
|----------|-------------|-------------------|---------------|------------|
| Critical | 0 | **5** | 1 | **1** |
| High | 0 | **7** | 0 | 0 |
| Medium | 2 | **4** | 8 | 10 |
| Low | 1 | 0 | 2 | 3 |

**Net improvement:** Strongest single-commit remediation to date. 5 Criticals and 7 Highs resolved in one pass. The only remaining Critical (C5 — Zod adapter validation) is the project's longest-standing debt item at 5 reviews.

---

## Top 3 Actions for Next Session

1. **Close Critical #5 — Zod validation in `pmsToEngineAdapter.ts` (5th consecutive review).** This is now the ONLY Critical in the project. Implement `validateAdapterOutput` with a Zod schema covering at minimum: `foir.*` (number, 0–100), `roi.*` (number, 0–50), `ltv` (number, 0–100), `maxTenure` (number, 1–360). Estimate: 2–3 hours for schema + tests + adapter integration.

2. **Replace hardcoded JSON file list in CI scanner with glob.** Change `scanFormBindsTos()` to glob `src/lib/config/**/*.json` and scan all matches. This makes the CI check self-maintaining as new JSON configs are added. Estimate: 15 minutes.

3. **Fix `coerceValueField()` silent nullification.** Return a 400 error for object/array inputs instead of silently replacing with `null`. Users deserve to know their input was rejected. Estimate: 10 minutes.

**Deployment note:** The `PolicySuggestions` index migration (Critical #2 fix) requires existing duplicate documents to be deduped before deployment. Run a dedup script or manual audit against production before deploying `9f258c60`.
