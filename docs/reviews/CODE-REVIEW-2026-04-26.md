# Daily Code Review — 2026-04-26

**Scope:** All commits since prior review (CODE-REVIEW-2026-04-25). 23 commits total in two passes:
- **Pass 1** (14 commits): S94 (2), teammate (2 incl. merge), S95 batches 1–7 + OTP hardening (10)
- **Pass 2** (9 commits): Phase 7 JSON Editor, Phase 9 DSA suggestions, Phase 11 key registry, affordability banner, PL rate fix, goto() UX fixes, unit tests

**Standing grep rules:** All 4 executed both passes. No new violations found.

---

## Teammate Commits

### `dd4ffa4c` — Mrityunjay Kumar: Add "Floor" to municipal compliance showWhen

**File:** [`src/lib/config/homeLoan/questionBank/propertyCondition.ts:193`](src/lib/config/homeLoan/questionBank/propertyCondition.ts:193)

Adds `"Floor"` to the `constructionType` list for `q1c_propertyComplianceStatus_municipal` showWhen condition (`['Flat', 'House']` -> `['Flat', 'House', "Floor"]`).

**Verdict: Logically correct, minor code quality issue**

Floor is a valid construction type for home loans — asking about municipal compliance for floors is appropriate. The change is sound.

**Code quality:** Mixed quote styles — `"Floor"` uses double quotes while `'Flat'` and `'House'` use single quotes. Missing space after comma before `"Floor"`. Inconsistent with project convention.

**No action needed** �� functionally correct. Quote consistency can be cleaned up opportunistically.

### `5402aa1b` — Mrityunjay Kumar: Merge branch 'main'

Standard merge commit pulling `dd4ffa4c` into main. No code changes. No issues.

---

## Prior Review Remediation Status

S95 batches 1–7 + commit `46535f24` addressed most critical/high findings from CODE-REVIEW-2026-04-25:

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| Critical #1 | OTP token no expiry — indefinitely replayable | **FIXED** | [`signingKey.ts:84-86`](src/lib/server/pms/signingKey.ts:84) — 15-min window slots embedded in HMAC. `verifyPmsOtpToken` accepts current + previous window. |
| Critical #2 | Impersonation cookie shares CRON_SECRET | **FIXED** | [`adminImpersonation.ts:18`](src/lib/server/adminImpersonation.ts:18) — uses `getPmsSigningKeyStrict()` which refuses CRON_SECRET fallback. |
| Critical #3 | Missing Zod validation in PMS adapter | **STILL OPEN** | [`pmsToEngineAdapter.ts:11`](src/lib/server/pms/pmsToEngineAdapter.ts:11) still references nonexistent `validateAdapterOutput`. NaN propagation risk remains. |
| High #4 | IP-only rate limit on OTP verify | **FIXED** | [`otp/verify/+server.ts:127-131`](src/routes/api/pms/otp/verify/+server.ts:127) — per-email rate limit bucket added. |
| High #5 | timingSafeEqual throws on wrong length | **FIXED** | [`adminImpersonation.ts:49-50`](src/lib/server/adminImpersonation.ts:49) — length check before `timingSafeEqual`. |
| High #6 | Impersonate exit no auth guard | **FIXED** | [`exit/+server.ts:21`](src/routes/api/admin/impersonate/exit/+server.ts:21) — `requireAuthApi` added. |
| High #7 | Unsafe `as number` cast on override | **FIXED** | [`pmsToEngineAdapter.ts:661`](src/lib/server/pms/pmsToEngineAdapter.ts:661) — runtime `typeof` + `Number.isFinite` guard. |
| High #8 | `ask_rm` not in resolution union | **FIXED** | [`policyTypes.ts:238`](src/lib/config/pms/policyTypes.ts:238) — `'ask_rm'` added to union. |
| High #9 | QA runner no rate limit | **FIXED** | [`qa-run/+server.ts:29`](src/routes/api/pms/policies/[id]/qa-run/+server.ts:29) — rate limit added. |
| Medium #14 | console.error rule violations | **FIXED** | No bare `console.*` in `evaluationEngine.ts` or `legacyCompare.ts`. |

**9 of 10 actionable findings fixed.** Critical #3 (Zod validation) remains the top priority carry-forward.

---

## Standing Grep Rules — Results

### Rule A — CSRF: raw `fetch()` on mutating endpoints

**52 matches total.** All reviewed against prior sweep ([2026-04-26-sweep.md](2026-04-26-sweep.md)):

- **Auth pages** (login, partner-signup): 15 raw `fetch` POSTs to `/api/auth/*` endpoints. These are **pre-session flows** — CSRF protection is not applicable because no session exists to protect. No action needed.
- **Share-link page** (`/f/[token]`): 3 raw `fetch` POSTs. **Pre-auth flow** for document verification. No session. Safe.
- **Onboarding** (BasicFields, AboutYou, verifyEmailOTP.ts): 5 raw `fetch` POSTs. These are during onboarding, before full session establishment. Auth endpoints don't check CSRF. Safe.
- **Session service** (`sessionService.ts`): 7 calls. Infrastructure auth service managing session lifecycle. CSRF check would be circular. Safe.
- **All GET calls** (states, pincodes, snapshots, results/staleness, preferred-dsas, test/results): 20 calls. GET is safe. No action needed.
- **External API** (`homeLoanApi.ts`): 3 POST calls to external `bank-loan-management.vercel.app`. Not internal. No CSRF needed.
- **`csrf.ts` itself**: 3 calls. This IS the secureFetch implementation. Expected.
- **Archived files** (`_archive/`): 2 calls. Not in active code path.

**1 low-priority finding:**

[`src/lib/utils/schemaUtils.ts:15`](src/lib/utils/schemaUtils.ts:15) — `uploadSchema()` uses raw `fetch` with POST to `/api/schemas`. Only 1 consumer (`src/lib/form/firstPage/schema.ts`). Should use `secureFetch` for consistency. Also has bare `console.error` at lines 33, 63, 93.

**New endpoints in Pass 2 are clean:** [`LenderResultCard.svelte:82`](src/lib/components/dashboard/results/LenderResultCard.svelte:82) and [`suggestions/+page.svelte:30`](src/routes/dashboard/rm/policies/[lenderId]/[product]/suggestions/+page.svelte:30) both use `secureFetch`. JSON Editor [`+page.svelte:69`](src/routes/dashboard/admin/policies/pms/[policyId]/json-editor/+page.svelte:69) uses `secureFetch`.

### Rule B — SSR crash: static `@capacitor/*` imports

**0 matches.** Clean.

### Rule C — `window.location.reload()`

**10 matches.** All match the known-acceptable list. No new violations.

### Rule D — async function returning Capacitor proxy

**0 matches.** Clean.

---

## Pass 1 — S94/S95 Commit Analysis

### S94 — Capacitor thenable-proxy fix (`2ff2d747`, `bc6e08cf`)

Well-executed fix for CLAUDE.md Pitfall #8. The envelope pattern in [`capacitorPreferences.ts`](src/lib/utils/capacitorPreferences.ts) correctly shields the Proxy from `await` unwrapping. Documentation commit is thorough.

### S95 Batches 1–7 — Security + SSR hardening

**104 files changed, +1033/-332 lines.** Systematic sweep addressing:
- **CSRF**: All dashboard `secureFetch` conversions across DSA, RM, admin dashboards
- **SSR**: `window.location` -> `$page.url` across 6 form pages (Pitfall #9)
- **Auth guards**: Explicit role guards on all dashboard page.server.ts loaders
- **Env validation**: New [`envValidation.ts`](src/lib/server/envValidation.ts) module
- **UX**: Themed unsaved-navigation modal replacing `window.confirm()`

**No issues found in the S95 batch commits.**

### OTP Hardening (`46535f24`)

Addresses prior review Critical #1 and High #4. Implementation is clean:
- **`crypto.randomInt(100000, 1000000)`** replaces `Math.random()` — correct CSPRNG
- **Dual rate limits** (IP + email) on verify — defense in depth
- **5/min IP rate limit** on send + `otpStore.exists()` per-email cooldown
- **Admin impersonation bypass** path is well-documented and correctly issues tokens via `getPmsSigningKey()`
- **Dev testddsa@ bypass** correctly validates email domain against lenderDirectory and is `dev`-gated

---

## Pass 2 — New Feature Commits (9 commits after `46535f24`)

### `5ee57dce` — feat(pms): Phase 7 JSON Editor (+510 lines, 6 files)

Admin escape-valve allowing direct JSON editing of published policy sections. Creates a fork → draft → auto-submit workflow with per-field PendingChange audit trail.

**Auth:** `requireRoleApi(locals, ['admin'])` on endpoint; `requireRole(locals, 'admin')` on loader. Correct.
**CSRF:** Uses `secureFetch` in Svelte page. Correct.
**Logging:** Uses `logger.info`, no bare `console`. Correct.
**Audit trail:** Per-field PendingChange records with `reason: 'admin_json_edit'`. Correct.

**Issues found — see Critical #1, High #2, High #3, Medium #6 below.**

### `71477192` — feat(results): affordability overview banner (+222 lines, 2 files)

New [`AffordabilityOverview.svelte`](src/lib/components/dashboard/results/AffordabilityOverview.svelte) component — read-only display of best Mode A/B/C affordability across eligible lenders. Clean component using `$derived.by()` with proper null guards. No `fetch`, no side effects, no security surface. Uses `formatCurrency` from i18n. Gracefully absent when no affordability data exists.

**No issues found.**

### `da94c863` — fix(ux): replace `window.location.href` with `goto()` in admin policy detail

Correctly replaces two `window.location.href` navigations with `goto()` from `$app/navigation`. Removes the now-unnecessary `browser` import.

**Code quality issue:** Indentation broken on line 5 of [`[policyId]/+page.svelte`](src/routes/dashboard/admin/policies/pms/[policyId]/+page.svelte:5) — `import { invalidateAll, goto } from '$app/navigation';` is at column 0 instead of tab-indented like surrounding imports. See Medium #7 below.

### `8f058116` — fix(ux): replace `window.location.href` with `goto()` in RM policy detail

Same pattern as `da94c863` for the RM-facing page. Clean implementation — `goto(editPageUrl)` replaces `if (browser) window.location.href = editPageUrl`. No indentation issues.

**No issues found.**

### `4ebb955a` — fix(rule-engine): use per-lender PL rate in discomfort analyzer PL bridge

Replaces hardcoded `plROI = 12` and `plTenure = 60` with per-lender lookups from category defaults + overrides. Uses the same pattern as [`evaluationEngine.ts:1243`](src/lib/ruleEngine/evaluationEngine.ts:1243).

**Minor concern:** `ev.classification as LenderClassification` at [`discomfortAnalyzer.ts:432`](src/lib/ruleEngine/discomfortAnalyzer.ts:432) lacks a defensive fallback. The evaluation engine at line 999 uses `ev.classification ?? 'pvt'`, proving the field can theoretically be null/undefined. In practice, [`evaluationEngine.ts:260`](src/lib/ruleEngine/evaluationEngine.ts:260) defaults to `'PVT'` when building the rule doc, so this is safe. But the evaluation engine's own PL bridge lookup at line 1243 uses the same bare cast — both sites should add `?? 'PVT'` for defense in depth. See Medium #8 below.

### `ffa894c9` — feat(pms): Phase 9 — DSA suggestion flow (+673 lines, 12 files)

DSAs submit policy suggestions from the results page via [`LenderResultCard.svelte`](src/lib/components/dashboard/results/LenderResultCard.svelte). RMs review them in an inbox at [`suggestions/+page.svelte`](src/routes/dashboard/rm/policies/[lenderId]/[product]/suggestions/+page.svelte). Three API endpoints: GET/POST suggestions, PATCH resolve.

**Auth:** `requireRoleApi` present on all endpoints. Page loader has `requireRole` + assignment check.
**CSRF:** Both Svelte pages use `secureFetch`. Correct.
**Logging:** All errors use `logger.error`. Correct.
**API helpers:** `apiOk`/`apiError`/`apiServerError` used exclusively. Correct.
**Template safety:** All user text rendered via `{text}` (Svelte auto-escapes). No `{@html}`. Correct.

**Issues found — see Critical #2, Critical #3, High #4, High #5, Medium #9 below.**

### `5ee57dce` + `a1c09e7a` + `1b702bea` + `6ea8d3e3` — Phase 11 key registry + tests (+1746 lines, 9 files)

Full key lifecycle management: 22 canonical var-path entries in [`keyRegistry.ts`](src/lib/config/pms/keyRegistry.ts), CI gate script, runtime health checker, admin dashboard at `/dashboard/admin/policies/registry-health`, and 28 unit tests.

**Auth:** API endpoint uses `requireRoleApi(locals, ['admin'])`. Page loader uses `requireRole(locals, 'admin')`. Correct.
**API helpers:** `apiOk`/`apiServerError` used. Correct.
**Testing:** 28 tests covering `extractVarPaths` and `checkKeyPathStatus` with edge cases. Good coverage.

**Issues found — see Critical #4, High #6, High #7, High #8, Medium #10, Medium #11, Medium #12 below.**

---

## Critical Findings (New)

### Critical #1 — JSON Editor: `lockVersion` parsed but never enforced (confidence: 100)

**Files:** [`admin-json-edit/+server.ts:127-130`](src/routes/api/pms/policies/[id]/admin-json-edit/+server.ts:127), [`policyService.ts:adminJsonEditPolicy`](src/lib/server/pms/policyService.ts)

The endpoint's body type includes `lockVersion: number` and the client sends `data.lockVersion`, but the value is **never extracted from the body** and **never passed to `adminJsonEditPolicy()`**. The service function doesn't accept a `lockVersion` parameter.

**Impact:** Two admins can both load the same published policy, both submit edits, and the second silently overwrites the first. Every other write path in PMS gates on `lockVersion` — this is the only one that doesn't.

**Fix:** Extract `lockVersion` from body, pass to `adminJsonEditPolicy`, check against the source published policy's `lockVersion` before creating the fork.

### Critical #2 — Suggestion dedup index missing `unique: true` (confidence: 95)

**File:** [`mongo.ts:718-720`](src/lib/database/mongo.ts:718)

```ts
await PolicySuggestions.createIndex(
    { lenderId: 1, loanProduct: 1, fieldPath: 1, submittedBy: 1 },
    { sparse: true }  // ← no unique: true
);
```

The comment says "one suggestion per DSA per field per lender per month" and the POST handler catches MongoDB error 11000, but a `sparse` index without `unique: true` allows duplicate documents. The catch block is dead code and the dedup guarantee does not hold.

**Fix:** Add `unique: true` to the index options. Requires dropping and recreating the index on any existing collection.

### Critical #3 — RM can resolve suggestions for any lender (confidence: 95)

**File:** [`suggestions/[id]/+server.ts:16-62`](src/routes/api/pms/suggestions/[id]/+server.ts:16)

The PATCH endpoint checks `requireRoleApi(locals, ['rm', 'admin'])` but does **not** verify the suggestion belongs to a lender the RM is assigned to. Any authenticated RM can resolve suggestions for any lender by calling the API directly.

The page loader at [`suggestions/+page.server.ts:24-32`](src/routes/dashboard/rm/policies/[lenderId]/[product]/suggestions/+page.server.ts:24) correctly checks `RmLenderAssignments.findOne(...)`, but this only protects the UI — the API is wide open.

**Fix:** Fetch the suggestion document first, check RM assignment for `suggestion.lenderId`, then proceed.

### Critical #4 — Registry health checker: `intendedKeyPath` field does not exist (confidence: 100)

**File:** [`registryIntegrityChecker.ts:133,139`](src/lib/server/pms/registryIntegrityChecker.ts:133)

The `PolicyFutureQueue` collection uses `FutureEnhancementItem` which has `proposedKeyPath: string | null` (not `intendedKeyPath`). The projection at line 133 requests `intendedKeyPath: 1` (silently excluded by MongoDB), and line 139 reads `item.intendedKeyPath` which is always `undefined`. Result: `futureQueueReady` is always `[]` — the "ready to encode" feature-queue detection is silently broken.

Additionally, the projection requests `addedAt: 1` but the type has `createdAt: Date`, causing `new Date(undefined)` → `Invalid Date`.

**Fix:** Change projection to `{ proposedKeyPath: 1, createdAt: 1 }` and read `item.proposedKeyPath` / `item.createdAt`.

---

## High Findings (New)

### High #1 — No rate limit on JSON Editor POST (confidence: 95)

**File:** [`admin-json-edit/+server.ts`](src/routes/api/pms/policies/[id]/admin-json-edit/+server.ts)

Every other PMS mutation endpoint has rate limiting (qa-run: 2/min, OTP: 5/min). This admin-only write endpoint has none.

**Fix:** Add `rateLimit(adminUserId, { maxRequests: 5, windowMs: 60_000, key: 'pms_admin_json_edit' })`.

### High #2 — No rate limit on suggestion POST (confidence: 95)

**File:** [`suggestions/+server.ts:80`](src/routes/api/pms/suggestions/+server.ts:80)

Same pattern — the POST endpoint for DSA suggestion submission has no rate limiting.

**Fix:** Add `rateLimit(ip, { maxRequests: 5, windowMs: 60_000, key: 'pms_suggestion_submit' })`.

### High #3 — `lockVersion` not Zod-validated (confidence: 85)

**File:** [`admin-json-edit/+server.ts:127`](src/routes/api/pms/policies/[id]/admin-json-edit/+server.ts:127)

The body is typed via `parseJsonBody<T>` with a TypeScript type assertion, not a Zod schema. If a caller sends `lockVersion: "not-a-number"`, it passes. The `SectionsSchema` validates sections but the outer body has no Zod wrapper.

**Fix:** Wrap in a Zod object: `z.object({ sections: z.unknown(), lockVersion: z.number().int().min(0) })`.

### High #4 — RM can read suggestions for any lender via API (confidence: 88)

**File:** [`suggestions/+server.ts:37-47`](src/routes/api/pms/suggestions/+server.ts:37)

GET endpoint for RM role requires `lenderId` query param but does not verify the RM has an active assignment for that lender. An RM can enumerate suggestions for any lender by iterating IDs.

**Fix:** Add assignment check after extracting `lenderId` for the RM branch.

### High #5 — `currentValue`/`suggestedValue` stored without type restriction (confidence: 90)

**File:** [`suggestions/+server.ts:106-107`](src/routes/api/pms/suggestions/+server.ts:106)

These fields are assigned raw from the parsed body (`body.currentValue ?? null`) with no type or size restriction. They land in MongoDB as arbitrary JavaScript values. Currently the DSA UI doesn't send these fields, but the API accepts anything — a crafted request can store arbitrarily deep objects.

**Fix:** Restrict to string-only with size cap: `typeof body.currentValue === 'string' ? body.currentValue.slice(0, 200) : null`.

### High #6 — CI gate script is not wired into CI or package.json (confidence: 100)

**File:** [`scripts/check-registry-integrity.cjs`](scripts/check-registry-integrity.cjs)

The script header says "Run on every PR and as part of pnpm check." Neither is true — `package.json` has no reference, `.github/workflows/ci.yml` has no step. All three CI rules (no row deletion, bindsTo presence, changelog matching) are currently unenforced.

**Fix:** Add `"check:registry": "node scripts/check-registry-integrity.cjs --skip-git"` to `package.json` scripts and add a CI step.

### High #7 — CI Rule B will fail for 4 keys when wired (confidence: 95)

**File:** [`scripts/check-registry-integrity.cjs:127-151`](scripts/check-registry-integrity.cjs:127)

`scanFormBindsTos()` only scans `questionBank/*.ts` files. It misses `applicantQuestion.json` and `applicantBasicDetailsSecuredLoans.json`. Four active `form`-sourced registry keys will immediately fail Rule B when the CI script is wired:
- `onProperty` / `onEMI` — only in `applicantBasicDetailsSecuredLoans.json`
- `isDefaulter` — derived in `payloadEnricher.ts`, not a form field (should be `source: 'computed'`)
- `relationshipType` — `bindsTo: 'relationshipToMainApplicant'` matches nothing; form uses `yourRelationship`

**Fix:** Extend `scanFormBindsTos()` to also scan applicant JSON configs. Fix `isDefaulter` source to `'computed'`. Fix `relationshipType` bindsTo to match the actual form field.

### High #8 — `isDefaulter` type declared as `boolean` but actual value is string `'Yes'`/`'No'` (confidence: 95)

**File:** [`keyRegistry.ts:201`](src/lib/config/pms/keyRegistry.ts:201)

The registry declares `type: 'boolean'`. In [`payloadEnricher.ts:419,786`](src/lib/ruleEngine/payloadEnricher.ts:419), the value is always `'Yes'` or `'No'` (strings). The PMS spec uses conditions like `{"==": [{"var": "isDefaulter"}, "Yes"]}`. Any downstream validation or AI pipeline prompt that trusts this metadata will generate wrong JSON-Logic rules.

**Fix:** Change to `type: 'enum', enumValues: ['Yes', 'No']`.

---

## Medium Findings (New)

### Medium #6 — JSON Editor: per-keystroke double-parse of original snapshot (confidence: 80)

**File:** [`json-editor/+page.svelte:21-53`](src/routes/dashboard/admin/policies/pms/[policyId]/json-editor/+page.svelte:21)

The `$derived.by` validation block calls `JSON.parse(data.sectionsJson)` (the original snapshot) on every keystroke. Since `data.sectionsJson` never changes, this parse should be hoisted outside the `$derived`. On a 10KB policy JSON, this creates measurable lag.

**Fix:** Move `const originalSections = JSON.parse(data.sectionsJson)` outside the `$derived.by`.

### Medium #7 �� Indentation broken on import line (confidence: 100)

**File:** [`[policyId]/+page.svelte:5`](src/routes/dashboard/admin/policies/pms/[policyId]/+page.svelte:5)

Line 5 reads `import { invalidateAll, goto } from '$app/navigation';` at column 0 — missing the leading tab that all other imports in the `<script>` block use. Introduced in commit `da94c863`.

**Fix:** Add leading tab to match surrounding lines.

### Medium #8 — `ev.classification as LenderClassification` without fallback (confidence: 75)

**Files:** [`discomfortAnalyzer.ts:432`](src/lib/ruleEngine/discomfortAnalyzer.ts:432), [`evaluationEngine.ts:1243`](src/lib/ruleEngine/evaluationEngine.ts:1243)

Both sites cast `ev.classification` to `LenderClassification` without a `?? 'PVT'` fallback. While `evaluationEngine.ts:260` ensures classification defaults to `'PVT'` when building rule docs, the cast is fragile — if a code path ever skips that default, `getCategoryDefaults(undefined)` returns `undefined` and the next property access crashes.

**Fix:** `getCategoryDefaults((ev.classification ?? 'PVT') as LenderClassification)` at both sites.

### Medium #9 — Suggestion display: hardcoded quote chars wrap `dsaNote` (confidence: 80)

**File:** [`suggestions/+page.svelte:172`](src/routes/dashboard/rm/policies/[lenderId]/[product]/suggestions/+page.svelte:172)

Template: `"{suggestion.dsaNote}"` — the literal `"..."` wrapping produces doubled quotes when a DSA note begins or ends with a quote character.

**Fix:** Remove the literal quotes and rely on `<blockquote>` styling, or use CSS `quotes`.

### Medium #10 — CI script: `countChangelogEntries()` defined but never called (confidence: 80)

**File:** [`scripts/check-registry-integrity.cjs:157-162`](scripts/check-registry-integrity.cjs:157)

Dead code stub. Rule C compares diff presence but never validates that the number of new changelog entries matches the number of new registry entries.

**Fix:** Either wire it into Rule C validation or remove the dead function.

### Medium #11 — Registry health UI `rerun()` fires health check twice (confidence: 80)

**File:** [`registry-health/+page.svelte:13-29`](src/routes/dashboard/admin/policies/registry-health/+page.svelte:13)

`rerun()` calls `GET /api/pms/registry/health`, discards the response, then calls `invalidateAll()` which re-runs `+page.server.ts load()` (which itself calls `runRegistryHealthCheck()` again). The check runs twice per click.

**Fix:** Remove the API call from `rerun()` and just call `invalidateAll()`.

### Medium #12 — `age` key: documentation conflict between registry and changelog (confidence: 85)

**File:** [`keyRegistry.ts:247`](src/lib/config/pms/keyRegistry.ts:247) vs [`registryChangelog.ts:167`](src/lib/config/pms/registryChangelog.ts:167)

Registry comment says "Primary applicant age". Changelog says "youngest applicant age in years". In `payloadEnricher.ts`, `_primary_age` uses `youngestApplicant?.age`. One description must be corrected — this matters for AI pipeline prompt context.

### Medium #13 — CI script uses `console.log` (needs ESLint exemption) (confidence: 70)

**File:** [`scripts/check-registry-integrity.cjs`](scripts/check-registry-integrity.cjs)

Appropriate for a CLI script, but the project has an ESLint `no-console` rule. Needs `/* eslint-disable no-console */` header or ESLint config exclusion.

---

## Carry-Forward Findings

### Critical — Still Open (3rd consecutive review)

**1. Missing Zod validation in PMS-to-Engine adapter** (from CODE-REVIEW-2026-04-25 Critical #3)

[`src/lib/server/pms/pmsToEngineAdapter.ts:11`](src/lib/server/pms/pmsToEngineAdapter.ts:11) — file header still promises `validateAdapterOutput` which does not exist. No runtime validation on adapter output. A malformed PMS `foir.salaried` stored as string `"50"` produces NaN from `/ 100` division, silently producing wrong eligibility. **This is the highest-priority open item and has been carry-forwarded for three consecutive reviews.**

### Medium — Still Open

**2. CIBIL floor applied twice for PMS docs** (#10) — PMS docs get both `hard_gate` rule in `sections.cibil` AND the `cibil_floor` synthetic gate. Produces GREY instead of RED/AMBER.

**3. In-memory rate limiter MAX_WINDOW_MS < OTP verify window** (#11) — `MAX_WINDOW_MS = 10min` at [`rateLimiter.ts:14`](src/lib/server/rateLimiter.ts:14) but OTP verify uses `windowMs: 15min`. Silent rate-limit reset at ~10min.

**4. Partial-resolve duplicate PendingChange records** (#12) — No deduplication on `$push: { $each: [...] }`.

**5. JSON-Logic override conditions without depth/structure validation** (#13) — `override.condition` from MongoDB passed verbatim to `jsonLogic.apply()`.

### Low — Still Open

**6. `schemaUtils.ts` uses raw `fetch` + bare `console.error`** — POST to `/api/schemas` should use `secureFetch`.

**7. Teammate code quality** — `dd4ffa4c` has mixed quote styles in JSON-Logic array.

---

## Summary

| Severity | New (Pass 2) | Carry-Forward | Total Open |
|----------|-------------|---------------|------------|
| Critical | 4 | 1 | **5** |
| High | 8 | 0 | **8** |
| Medium | 8 | 4 | **12** |
| Low | 0 | 2 | 2 |
| Teammate | 0 | 1 | 1 |

**Top 3 actions for next session:**
1. **Fix suggestion authorization + dedup** — add `unique: true` to index ([`mongo.ts:718`](src/lib/database/mongo.ts:718)), add RM assignment checks to GET and PATCH suggestion API endpoints, add rate limits to both suggestion and JSON Editor POST endpoints (Critical #2 + #3, High #1 + #2 + #4)
2. **Fix registry health checker field names** — change `intendedKeyPath` → `proposedKeyPath` and `addedAt` → `createdAt` in [`registryIntegrityChecker.ts`](src/lib/server/pms/registryIntegrityChecker.ts), fix `isDefaulter` type to `enum` in [`keyRegistry.ts`](src/lib/config/pms/keyRegistry.ts) (Critical #4, High #7 + #8)
3. **Wire `lockVersion` enforcement** in JSON Editor and implement Zod validation in `pmsToEngineAdapter.ts` — both are data-integrity issues, the Zod gap is now on its 3rd consecutive review (Critical #1, Critical carry-forward #1)

**Quick wins (same session):** Wire CI script into package.json (High #6), fix `rerun()` double-call (Medium #11), fix indentation (Medium #7).
