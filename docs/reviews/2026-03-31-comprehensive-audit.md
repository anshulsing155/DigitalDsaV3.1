# DigitalDSA-V3 — Comprehensive Audit Report

**Date**: 2026-03-31
**Scope**: Security, Performance, Code Consistency, App Flow, Data Integrity
**Codebase State**: Commit `0fd104e3` on `main` branch

---

## Executive Summary

This audit covers the full DigitalDSA-V3 codebase across 5 dimensions. **52 findings** total:

| Severity | Count | Areas |
|----------|-------|-------|
| CRITICAL | 2 | Security |
| HIGH | 11 | Security (5), Performance (4), SSR (1), Memory (1) |
| MEDIUM | 18 | Security (3), Performance (7), Auth (2), Data (2), Flow (3), Rules (1) |
| LOW | 15 | Various |
| INFO | 6 | Various |

**Top 5 priorities before production:**
1. JWT tokens exposed in response body (CRIT-1)
2. Share link submit has no server-side OTP proof (CRIT-2)
3. `{@html error}` XSS vectors in form components (HIGH-1)
4. Dashboard endpoints fetch full case documents 4× per load (PERF-3)
5. CSP nonce generated but not threaded into SvelteKit templates (HIGH-5)

---

## 1. SECURITY

### CRITICAL

#### CRIT-1: JWT Tokens Returned in Response Body (Defeats HttpOnly Cookies)
- **Files**: `api/auth/signup/+server.ts:119-120`, `api/auth/check-dsa/+server.ts:162-163`
- **Impact**: `accessToken` and `refreshToken` are returned in the JSON body even though they're already set as `httpOnly` cookies. Any XSS can steal them from the response.
- **Fix**: Remove `accessToken` and `refreshToken` from JSON response bodies entirely. Clients should rely solely on the httpOnly cookies.

#### CRIT-2: Share Link Submit Has No Server-Side OTP Verification
- **File**: `api/share-link/submit/+server.ts:47-49`
- **Impact**: The submit endpoint trusts that OTP was verified client-side. An attacker with a valid share token can POST arbitrary applicant data (income, credit, obligations) without completing OTP. The `verify-otp` endpoint sets no server-side proof.
- **Fix**: After OTP verification, set a short-lived httpOnly signed session cookie (HMAC of `token:mobile:timestamp`). Submit endpoint must validate this cookie.

### HIGH

#### HIGH-1: `{@html error}` XSS Vectors in Form Components
- **Files**: `InputField.svelte:283`, `ApplicantSelect.svelte:452,460`, `BooleanSelect.svelte`
- **Impact**: Error messages rendered as raw HTML. If any validation path includes user-influenced text, this is a stored/reflected XSS vector.
- **Fix**: Replace `{@html error}` with `{error}` throughout. Use DOMPurify if HTML formatting is needed.

#### HIGH-2: Internal Error Messages Leaked to Client
- **Files**: `api/auth/send-otp/+server.ts:77-79`, `api/form/submit/+server.ts:104`, `api/rule-engine/evaluate/+server.ts:115`, `api/form/location/+server.ts:170`
- **Impact**: `err.message` returned to client — includes raw MSG91 API responses, stack traces, internal paths.
- **Fix**: Return generic error messages; log details server-side with `logger.error()`. Use `apiServerError()` consistently.

#### HIGH-3: `console.error` in `hooks.server.ts` Instead of Structured Logger
- **File**: `hooks.server.ts:29,372`
- **Impact**: Violates project convention; raw error objects bypass Pino pipeline.
- **Fix**: Replace with `logger.fatal()` / `logger.error({ err }, 'message')`.

#### HIGH-4: Cookie `secure` Flag Uses `process.env.NODE_ENV` Instead of `!dev`
- **Files**: `api/auth/verify-otp/+server.ts:77,98,106,116`, `api/auth/check-dsa/+server.ts:132,140,148`
- **Impact**: Not equivalent to SvelteKit's `dev` flag in all deployment environments.
- **Fix**: Replace all instances with `secure: !dev` from `$app/environment`.

#### HIGH-5: CSP Nonce Generated But Not Threaded Into Template
- **File**: `hooks.server.ts:540-544`
- **Impact**: Nonce in CSP header but never passed to `app.html` via `%sveltekit.nonce%`. All inline scripts blocked OR CSP is unenforced.
- **Fix**: Store nonce in `event.locals.cspNonce`, use SvelteKit's built-in nonce integration.

### MEDIUM

#### MED-S1: Refresh Token Expiry Not Validated During Rotation
- **File**: `hooks.server.ts:52-119`
- **Impact**: DB-level `refreshTokenExpiry` bypass — if token is revoked by setting expiry to past, JWT itself may still be valid.
- **Fix**: Add `if (refreshTokenExpiry < now) reject` after `activeTokenIds` check.

#### MED-S2: Rate Limiting IP/Mobile Not Coupled
- **File**: `api/auth/verify-otp/+server.ts:47-53`
- **Impact**: Distributed attackers can target a single mobile from multiple IPs.

#### MED-S3: Missing HSTS Header
- **File**: `hooks.server.ts:532-535`
- **Impact**: No SSL-stripping protection for a fintech app handling financial data.
- **Fix**: Add `Strict-Transport-Security: max-age=31536000; includeSubDomains`.

---

## 2. PERFORMANCE

### HIGH

#### PERF-1: MongoDB Module-Level `await` + No Pool Config + `process.exit(1)`
- **File**: `database/mongo.ts:42,50`
- **Impact**: Top-level `await` blocks entire module graph during cold start. Default pool size of 10 is insufficient for production. `process.exit(1)` on connection failure crashes containerized deployments with no recovery.
- **Fix**: Lazy connection singleton with exponential backoff. Configure `maxPoolSize: 50, minPoolSize: 5`. Replace `process.exit(1)` with error propagation.

#### PERF-2: `EmailOtpModal` Interval Started at Script Init (Not `onMount`)
- **File**: `EmailOtpModal.svelte:22-23`
- **Impact**: `setInterval` fires during SSR; leaks on abnormal unmount.
- **Fix**: Move `startCooldown()` into `onMount` with `$effect` return cleanup.

#### PERF-3: Full Case Document Fetches Without Projection (4× Per Dashboard Load)
- **Files**: `api/dashboard/scorecard/+server.ts:29`, `api/dashboard/crm/+server.ts:158`, `api/dashboard/reminders/+server.ts:40`, `api/dashboard/policy-alerts/+server.ts:29`
- **Impact**: Each endpoint independently fetches ALL fields from ALL cases for a DSA. A DSA with 200 cases reads 200 large documents × 4 endpoints per dashboard refresh.
- **Fix**: Use `$project` aggregation pipelines. Consider a single "dashboard aggregate" endpoint. Add field projections to limit returned data.

#### PERF-4: `is_archived: { $ne: true }` Bypasses Compound Index
- **Files**: `api/cases/+server.ts:56`, reminders, policy-alerts, crm endpoints
- **Impact**: MongoDB cannot use equality index scan for `$ne`. Should be `is_archived: false`.
- **Fix**: Change all `{ $ne: true }` to `false` to match the `{ dsa_id, is_archived, updated_at }` compound index.

### MEDIUM

#### PERF-5: Schema Deep-Clone on Every Form Evaluate Request
- **File**: `formEngine/schemaLoader.ts:110`
- **Impact**: `JSON.parse(JSON.stringify(schema))` runs on every Next/Previous click. Home loan schema is large.
- **Fix**: Use `Object.freeze()` on cached schemas or confirm engine doesn't mutate them, then return directly.

#### PERF-6: `combinedAnswers` $derived Re-Computes on Every Keystroke
- **File**: `home-loan/+page.svelte:779-808`
- **Impact**: Creates new object + shorthand key expansion on every answer change. Cascades to `visibleQuestions`, `isNextEnabled`, auto-scroll, and option-clearing effects.
- **Fix**: Extract to shared utility; consider memoization or debouncing.

#### PERF-7: 14 `$effect` Blocks in Home Loan Page
- **File**: `home-loan/+page.svelte`
- **Impact**: Cascading reactive updates on overlapping state (`currentAnswers`, `combinedAnswers`, `visibleQuestions`). Auto-scroll runs on every keystroke (tracks `currentAnswers` unnecessarily).
- **Fix**: Reduce effect count; auto-scroll should only track `visibleQuestions` membership changes.

#### PERF-8: `isNextEnabled` Runs JSON-Logic for All Visible Questions Per Keystroke
- **File**: `home-loan/+page.svelte:585-629`
- **Impact**: Warning conditions evaluated for every visible question on every state change.
- **Fix**: Debounce warning evaluation or compute separately from Next button enablement.

#### PERF-9: `mobileNumber` Type Inconsistency Causes `$in` Queries
- **File**: `server/caseHelpers.ts:77`
- **Impact**: Mobile numbers stored as both `number` and `string`. `$in` with dual types on every authenticated request bypasses the unique index.
- **Fix**: One-time migration to normalize `mobileNumber` to a single type.

#### PERF-10: `to-words` Eagerly Imported in 11 Client Files
- **Files**: `home-loan/+page.svelte:6`, LAP, plot-loan, 8 components
- **Impact**: Number-to-words converter loaded in main bundle; only needed on number input.
- **Fix**: Dynamic import in `onInput` handler.

#### PERF-11: No Code Splitting on Form Pages
- **Files**: All 6 form page components
- **Impact**: All form sub-components (income, credit, obligations, directors) statically imported. Only some are visible per wizard page.
- **Fix**: Lazy-load components based on current wizard step.

### LOW

#### PERF-12: `deviceState` Resize Listener Never Removed
- **File**: `stores/device.svelte.ts:29-31`
- **Impact**: Multiple listeners accumulate in HMR/Capacitor reload.

#### PERF-13: `PayloadDebugger` Import in Production Bundle
- **File**: `form/+layout.svelte:14`
- **Impact**: Component imported but usage commented out; may survive tree-shaking.
- **Fix**: Remove the import statement.

#### PERF-14: `visiblePageMap` Re-evaluates All Pages on Every `evaluatePage`
- **File**: `formEngine/engine.ts:367-374`
- **Impact**: Quadratic visibility evaluation (18 pages × ~5 questions each).

#### PERF-15: `queueMicrotask` Inside `$effect` (17 files)
- **Impact**: Creates opaque reactive feedback cycles the Svelte compiler cannot analyze.

---

## 3. APP FLOW & LOGIC

### MEDIUM

#### FLOW-1: Logout Does Not Clear `activeTokenIds`
- **File**: `api/auth/logout/+server.ts:29-38`
- **Impact**: After logout, captured refresh token remains in `activeTokenIds` array. Token rotation in hooks checks this array — stale tokens valid for up to 30 days.
- **Fix**: Add `$set: { activeTokenIds: [] }` in logout update.

#### FLOW-2: Duplicate Refresh Endpoint (`/api/auth/refresh` vs `/api/auth/refresh-token`)
- **Files**: `api/auth/refresh/+server.ts` (broken for DSA/RM), `api/auth/refresh-token/+server.ts` (correct)
- **Impact**: Legacy `/refresh` only queries `Applicant` collection; does not update token IDs in DB.
- **Fix**: Remove or redirect `/api/auth/refresh` to `/api/auth/refresh-token`.

#### FLOW-3: Global JSON-Logic `!=` Override Affects Rule Engine
- **File**: `formEngine/visibility.ts:37-46`
- **Impact**: Module-level `jsonLogic.add_operation('!=', ...)` patches the shared singleton. Rule engine evaluations in the same process get "unanswered = hide" semantics for `!=`.
- **Fix**: Document for rule authors. Consider scoped json-logic instances.

#### FLOW-4: `/api/form/submit` Only Validates — Never Persists
- **File**: `api/form/submit/+server.ts:96-101`
- **Impact**: Returns `{ validated: true }` but writes no data. Callers must separately call `evaluate-and-persist`. If client treats `success: true` as "done", no data is stored.
- **Fix**: Document clearly in API contract or merge into `evaluate-and-persist`.

#### FLOW-5: Race Condition in Snapshot Version Assignment
- **Files**: `api/cases/[case_id]/snapshots/+server.ts:124-128`, `api/evaluate-and-persist/+server.ts:122-151`
- **Impact**: Version determined by `findOne + 1`. Concurrent requests for same case could assign duplicate version numbers.
- **Fix**: Add unique compound index `(case_id, version)` or use atomic counter.

#### FLOW-6: `evaluate-and-persist` Does Not Retry E11000 (Unlike `POST /api/cases`)
- **Files**: `api/evaluate-and-persist/+server.ts:388-403` vs `api/cases/+server.ts:169-225`
- **Impact**: Primary submission path fails permanently on counter drift instead of self-healing.
- **Fix**: Add 5-retry loop matching `/api/cases` pattern.

### LOW

#### FLOW-7: RM `lastActiveAt` Never Updated (Wrong Collection)
- **File**: `hooks.server.ts:391-396`
- **Impact**: Activity tracker updates `Applicant` for RM users, but RMs are in `rmApplications`.
- **Fix**: Add `if (role === 'rm') { rmApplications.updateOne... }` branch.

#### FLOW-8: `isRole()` Type Guard Excludes `'rm'`
- **File**: `hooks.server.ts:400-404`
- **Impact**: `type Role = 'admin' | 'user' | 'dsa'` missing `'rm'`. Guards still work via `locals.user.role` fallback, but fragile.
- **Fix**: Add `'rm'` to the Role union type.

#### FLOW-9: Zero-Lender Result Creates Empty Case
- **File**: `ruleEngine/evaluationEngine.ts`
- **Impact**: If no active rule artifacts exist for a loan type, case and snapshot are created with empty results. DSA sees blank screen with no explanation.
- **Fix**: Return a meaningful message when zero lenders matched.

---

## 4. DATA INTEGRITY

### MEDIUM

#### DATA-1: Case Archival Does Not Cascade
- **File**: `api/cases/[case_id]/+server.ts:188-199`
- **Impact**: Archiving sets `is_archived: true` on Cases only. Snapshots, timeline events, communication threads, share links remain active and queryable.

#### DATA-2: Sample Data Deletion Does Not Clean Snapshots
- **Files**: `api/cases/sample-data/+server.ts:38-41`, `api/rm/sample-data/+server.ts:44-46`
- **Impact**: `FormSnapshots` and `LenderResultsSnapshots` for deleted sample cases remain as orphans.
- **Fix**: Add `FormSnapshots.deleteMany({ case_id: { $in: sampleCaseIds } })` alongside case deletion.

### LOW

#### DATA-3: Account Deletion Does Not Cascade to Cases
- **File**: `api/auth/delete-account/+server.ts`
- **Impact**: Deleted DSA's cases remain with original `dsa_id`. Restored DSA may get new `_id`, losing access to old cases.

#### DATA-4: `payload_hash` Not Deterministic Across Object Construction Paths
- **File**: `server/snapshotHelpers.ts:21-23`
- **Impact**: `JSON.stringify` doesn't guarantee key ordering. Same logical payload from different paths → different hashes.
- **Fix**: Use canonical JSON stringification (sort keys before hash).

#### DATA-5: No TTL on `FormSnapshots`
- **Impact**: Immutable snapshots accumulate indefinitely. No cleanup policy for old snapshots.

---

## 5. CODE CONSISTENCY

### MEDIUM

#### CONS-1: Bare `fetch` Instead of `secureFetch` in Multiple Files
- **Files**: `walkthrough.svelte.ts` (PATCH), `dashboard/+layout.svelte` (POST), `dashboard/rm/+page.svelte` (DELETE/POST), `home-loan/+page.svelte:697` (GET in edit mode)
- **Impact**: CSRF token not injected; inconsistent with codebase convention.
- **Fix**: Replace all with `secureFetch`.

#### CONS-2: Deprecated `assessIncome` V1 Still Imported
- **File**: `ruleEngine/evaluationEngine.ts:43`
- **Impact**: Dead import. V2 is canonical but V1 import creates confusion risk.
- **Fix**: Remove unused import.

#### CONS-3: `as any` Type Casts in Database Queries
- **File**: `server/caseHelpers.ts:77` and others
- **Impact**: Bypasses TypeScript type checking for MongoDB queries.

### LOW

#### CONS-4: `extractGrossMonthlyIncome` Case Label Mismatch
- **File**: `ruleEngine/incomeAssessor.ts:108-120`
- **Impact**: V1 uses `'Pensioner'`/`'Unemployed'` (raw strings) vs V2 uses `'pension'`/`'no_current_income'` (profile types).

#### CONS-5: `window.location.href` in SSR Template
- **Files**: `home-loan/+page.svelte:1905-1907`, `lap/+page.svelte:1306`
- **Impact**: Hydration mismatch risk. Should use `$page.url.searchParams`.

#### CONS-6: `appliedApplication` Endpoint Lacks Role Check and Rate Limiting
- **File**: `api/appliedApplication/+server.ts`
- **Impact**: Any authenticated user can write arbitrary data.

---

## 6. FUTURE RISKS

### Scalability Concerns

| Risk | Current State | Trigger Point | Mitigation |
|------|--------------|---------------|------------|
| Dashboard N×4 full-doc fetches | Works for <50 cases | 200+ cases per DSA | Aggregation pipelines + projections |
| Schema deep-clone per request | Works for low traffic | 100+ concurrent form sessions | Freeze schemas, return directly |
| No connection pool config | Default 10 connections | 50+ concurrent users | Configure `maxPoolSize: 50` |
| `FormSnapshots` unbounded growth | Works for months | Years of operation | TTL policy or archival pipeline |
| `mobileNumber` type inconsistency | Works with `$in` hack | Index performance degrades at scale | Normalize to single type |

### Architectural Debt

| Debt Item | Impact | Effort |
|-----------|--------|--------|
| 6 near-identical form pages (~6,000 LOC duplicated) | Every bug fix needs 3-6 file edits | High — extract generic `FormPage.svelte` |
| `queueMicrotask` in 17 `$effect` blocks | Opaque reactive feedback cycles | Medium — restructure state flow |
| Two refresh token endpoints | Confusion, inconsistent behavior | Low — remove legacy `/refresh` |
| Global json-logic `!=` override | Affects rule engine silently | Low — document or scope |
| Razorpay loaded at root layout | 150KB for all sessions | Low — lazy load on billing page |

### Missing Production Infrastructure

| Item | Status | Priority |
|------|--------|----------|
| HSTS header | Missing | HIGH — add immediately |
| CSP nonce threading | Broken | HIGH — fix before production |
| Rate limiting on `appliedApplication` | Missing | MEDIUM |
| Snapshot version race protection | Missing | MEDIUM |
| Cascade on delete/archive | Missing | LOW — acceptable for MVP |

---

## Recommended Fix Order

### Phase 1: Security (Before Production)
1. CRIT-1: Remove tokens from response body
2. CRIT-2: Add server-side OTP proof for share link submit
3. HIGH-1: Replace `{@html error}` with safe rendering
4. HIGH-2: Stop leaking `err.message` to clients
5. HIGH-5: Fix CSP nonce threading
6. MED-S3: Add HSTS header
7. HIGH-4: Normalize cookie `secure` flag to `!dev`

### Phase 2: Data Integrity & Auth
8. FLOW-1: Clear `activeTokenIds` on logout
9. FLOW-2: Remove duplicate `/api/auth/refresh` endpoint
10. FLOW-5: Add unique index `(case_id, version)` on snapshots
11. FLOW-6: Add E11000 retry to `evaluate-and-persist`
12. DATA-2: Clean snapshots on sample data deletion

### Phase 3: Performance
13. PERF-1: Configure MongoDB connection pool + lazy connection
14. PERF-3: Add `$project` to dashboard queries
15. PERF-4: Change `$ne: true` to `false` in case queries
16. PERF-5: Eliminate schema deep-clone
17. PERF-9: Normalize `mobileNumber` type (migration)

### Phase 4: Code Quality
18. CONS-1: Replace bare `fetch` with `secureFetch`
19. CONS-2: Remove dead V1 income assessor import
20. PERF-2: Fix `EmailOtpModal` interval timing
21. PERF-7: Reduce $effect count in form pages
22. CONS-5: Replace `window.location.href` with `$page.url`

### Phase 5: Architecture (Post-Launch)
23. Extract generic `FormPage.svelte` from 6 duplicated pages
24. Code-split form sub-components by wizard step
25. Lazy-load `to-words` and Razorpay
26. Add `FormSnapshots` TTL policy
27. Restructure `queueMicrotask` patterns

---

*Generated by automated audit — 2026-03-31*
*Verify line numbers against current codebase before applying fixes.*
