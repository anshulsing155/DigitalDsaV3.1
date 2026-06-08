# S73 Code Review — 2026-04-12

**Scope:** 9 commits `a53ab3ab..212e950a` (S73 batch)
**Files changed:** 66 (+2,521 / -420)
**Author:** Prashant (all commits)

---

## HIGH Severity

### 1. [SECURITY] `.passthrough()` on Zod schema allows arbitrary field injection
**File:** `src/routes/api/appliedApplication/+server.ts:19`

Zod schema uses `.passthrough()`, letting unknown fields through into `insertOne()`. An authenticated user can inject arbitrary keys into the MongoDB document (e.g., `is_admin: true`, operator keys).

**Fix:** Remove `.passthrough()` — Zod strips unknown fields by default. Use `.strict()` if you want explicit rejection.

### 2. [SECURITY] XSS in email template — URL interpolated without escaping
**File:** `src/lib/server/email.ts:217-219, 261-263`

`sendVerificationEmail` and `sendPasswordResetEmail` interpolate `verificationUrl`/`resetUrl` directly into `<a href="">` HTML without escaping. A crafted URL with `"><script>...` or `javascript:` protocol would execute in email clients that render HTML.

**Fix:** Pass URLs through `escapeHtml()` (already available in `sanitize.ts`) before interpolation.

---

## MEDIUM Severity

### 3. [BUG/UX] `canGoToNextTab()` blocks on ALL warnings, ignoring `keepable: true`
**File:** `src/lib/components/IncomePageNew.svelte:681`
**File:** `src/lib/utils/crossStepValidator.ts:454-469`

`canGoToNextTab()` returns false when `modalCrossWarnings.length > 0`, but `turnover_mismatch` is marked `keepable: true` (advisory-only). DSAs who entered correct financials but haven't updated turnover category on a different page are stuck — dead end. The `CrossFieldWarningBanner` even shows a "→ Income" button pointing back to the same tab.

**Fix:** Only block on non-keepable warnings: `modalCrossWarnings.some(w => !w.keepable)`.

### 4. [BUG/UX] Guarantor-only mode hides entries but doesn't remove from data → inflated FOIR
**File:** `src/lib/components/ObligationCapture.svelte:102-107`

When `guarantorOnlyMode` is active, co-borrower entries are hidden from UI via `visibleEntryCount` filter but remain in `currentAnswers.obligations`. Rule engine loops over all obligations → FOIR is inflated by phantom entries → loans may fail incorrectly.

**Fix:** Either (a) filter non-guarantor entries at payload build time when `ObligationsRunning === 'No'`, or (b) actively remove them on mode transition with confirmation.

### 5. [BUG] `syncLinkedEntriesAcrossApplicants` doesn't stamp `updatedAt` on synced entries
**File:** `src/lib/utils/sameCompanySync.ts:231-246`

Source of truth is elected by comparing `updatedAt`. Synced entries retain their old timestamp. If a synced entry is later edited (updating its `updatedAt`), it becomes the new source and overwrites the original's company-level fields on the next sync cycle.

**Fix:** Stamp `updatedAt: new Date().toISOString()` on every synced member entry.

### 6. [SECURITY] Temp files with PII written to `process.cwd()/temp/`
**File:** `src/lib/utils/emailSend.ts:92-98`

Admin email serializes full application data to temp JSON/PDF files. Path is relative (could land in web root), filenames are guessable timestamps, and hard process kills skip cleanup.

**Fix:** Use `os.tmpdir()` instead of `process.cwd() + '/temp'`. Lower priority given Phase H email migration planned.

### 7. [CODE] Mixed env source in email.ts
**File:** `src/lib/server/email.ts:11, 79, 86, 322-327`

Build-time `$env/static/private` used for credentials, but runtime `process.env` used for config check. `emailConfig.isConfigured` checks AWS env vars, but actual transport is Nodemailer SMTP. Misleading for monitoring/health checks.

---

## LOW Severity

### 8. [CODE] Dead stub `detectOrphanDirector` still wired into orchestrator
**File:** `src/lib/utils/crossStepValidator.ts:754-758, 960`

Always returns `[]`. Category `'orphan_director'` still in union type. Remove or add TODO.

### 9. [CODE] Unused import `isNonFamily`
**File:** `src/lib/utils/crossStepValidator.ts:23`

Imported from component path but never called. Cross-layer coupling (utils → component).

### 10. [CODE] Fragile unsecured-loan heuristic
**File:** `src/lib/utils/crossStepValidator.ts:980`

```ts
const isUnsecured = !applicants.some(a => a.onProperty !== undefined || a.onEMI !== undefined);
```

Fires incorrectly for secured loans in intermediate wizard state (before Step 2). Should use `loanType` from `_applicationData` instead.

### 11. [TEST GAP] `sameCompanySync.test.ts` — no tie-breaking test
No test for entries with identical `updatedAt`. The `reduce` picks iteration order (deterministic but undocumented).

### 12. [TEST GAP] `stakeholderManagement.test.ts` — `isDirectorSkippable` untested for MEDIUM family dominance
Only HIGH dominance tested. MEDIUM behavior is unverified.

---

## Positive Observations

- **sameCompanySync.ts** (412 lines): Well-structured pure functions, no side effects, no `console`, no `fetch`. Clean separation.
- **636 lines of sync tests**: Thorough edge cases (null names, Company-type skip, 3-applicant groups).
- **hooks.server.ts parallel queries**: Good perf improvement (4 sequential DB calls → 1 `Promise.all`).
- **No module-scope fetch violations** in `+layout.svelte` — `registerDevice()` correctly in `onMount`.
- **Landing page changes**: No `{@html}` or `innerHTML` — no XSS surface.
- **emailUtils.ts**: Clean archive, no dangling imports.
- **variationMatcher.ts**: Uses `logger` (Pino) throughout, graceful fallback on DB failure.

---

## Action Priority

| Priority | Items | Effort |
|----------|-------|--------|
| Fix now | #1 (passthrough), #2 (XSS), #3 (keepable) | ~1 hr |
| Fix soon | #4 (obligation FOIR), #5 (updatedAt) | ~2 hrs |
| Low urgency | #6-#12 | Incremental |
