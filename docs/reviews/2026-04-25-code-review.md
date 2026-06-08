# Code Review — 2026-04-25

**Scope**: 17 commits since last review (2026-04-24), covering `cb43a638..761c3bca`
**Reviewer**: Automated daily review (Claude Code)
**Focus**: Security, bugs, UX issues, codebase alignment

---

## Previous Review Follow-Up

The 2026-04-24 review raised 1 MEDIUM finding and 3 LOW findings:

| Finding | Status | Notes |
|---------|--------|-------|
| B1 — `isPrimaryApplicant` not plumbed through all consumers | **FIXED** | `cb43a638` — plumbed through primary getter and profession lock |
| L1 — `setup.sh` global git config | **FIXED** | `b0751b35` — scoped git config to repo |
| L2 — `.nvmrc` vs `engines.node` conflict | **FIXED** | `b0751b35` — aligned `.nvmrc` with `engines.node` |
| L3 — pre-push rebase hint | Not addressed (low priority, OK to defer) |

---

## Commits Reviewed

| Commit | Description | Risk |
|--------|-------------|------|
| `cb43a638` | Plumb isPrimaryApplicant through primary getter + profession lock | LOW (fix) |
| `b0751b35` | Align .nvmrc, scope git config to repo | TRIVIAL |
| `4f1833a6` | PMS implementation plan + scaffolding (docs + types) | LOW |
| `2ba02b9a` | **PMS Phase 0** — RM identity + lender assignment system | HIGH |
| `5fd85f84` | **PMS Phase 2** — server foundation + admin RM assignments | HIGH |
| `016d9584` | **PMS Phase 3** — AI pipeline + policy CRUD + RM detail page | HIGH |
| `4ed5c138` | Cross-loan applicant recovery + applicant-state audit fixes (S84) | MEDIUM |
| `3fe2a308` | **PMS Phase 4** — RM encode wizard (6-step) | MEDIUM |
| `a2de0577` | F4-D — clear stale secured-product keys on secured route mount | MEDIUM |
| `7f7fd63e` | NB-4 — blank-slate applicationData on cross-category loan switch | MEDIUM |
| `e4881ad6` | Patch 8 encode wizard bugs from S85 review | LOW |
| `9e17e9fe` | **PMS Phase 5** — RM edit mode (Entry A: direct field edit) | MEDIUM |
| Others (5) | Docs/handoff updates | TRIVIAL |

---

## Findings

### CRITICAL

#### C-1: OTP generated with `Math.random()` — not cryptographically secure

**File**: `src/routes/api/pms/otp/send/+server.ts:59`

```ts
const otp = String(Math.floor(100000 + Math.random() * 900000));
```

`Math.random()` is not a CSPRNG. The existing auth OTP system already uses `crypto.randomInt` (fixed in S69, per CLAUDE.md "OTP crypto.randomInt"). The PMS OTP endpoint introduces a parallel, weaker implementation. An attacker who can observe timing or correlate outputs could predict OTP values.

**Fix**: `const otp = String(crypto.randomInt(100000, 1000000));` — or reuse the existing `generateOTP()` from `emailService.ts`.

#### C-2: `pmsOtpToken` has no expiry — HMAC valid forever

**Files**: `src/routes/api/pms/otp/verify/+server.ts:56-63`, `src/routes/api/pms/policies/[id]/submit/+server.ts:59-66`, `src/lib/server/guards.ts:368-403`

The issued HMAC token contains `rmUserId:lenderId:policyId:draftHash` but no timestamp. Once issued, it never expires. If `draftHash` doesn't change between verify and a future submit, an old token works indefinitely. Combined with the `Math.random()` OTP, this chain is weak end-to-end.

**Fix**: Embed `expiresAt` in the HMAC payload: `${rmUserId}:${lenderId}:${policyId}:${draftHash}:${expiresAt}`. Validate expiry on every verification.

#### C-3: LLM output stored to MongoDB without structural validation

**File**: `src/lib/server/pms/aiPipeline.ts:160,232,301,378,452`

`parseJsonResponse` does only `JSON.parse` with an `as T` cast — zero runtime validation of field types, required keys, or value ranges. A hallucinated or adversarial LLM response could write `{ overallScore: null }`, missing `clauseId` fields, or arbitrary nested objects directly into `lender_policies`. The project already uses Zod on other API routes.

**Fix**: Add a thin Zod schema for each pass's return type. Validate before returning from `runPassN`.

---

### HIGH

#### H-1: `CRON_SECRET` reused as PMS OTP signing key — key separation violation

**Files**: `src/routes/api/pms/otp/verify/+server.ts:46`, `src/lib/server/guards.ts:368`, `src/routes/api/pms/policies/[id]/submit/+server.ts:61`, `src/routes/api/pms/lender-assignments/onboard/+server.ts:43`

The same `CRON_SECRET` env var authenticates cron jobs AND signs RM identity tokens. A compromised cron runner gains the ability to forge PMS OTP tokens, and vice versa. These are distinct trust domains.

**Fix**: Introduce `PMS_SIGNING_SECRET` env var. One-line change in four files.

#### H-2: No rate limiting on OTP send/verify endpoints

**Files**: `src/routes/api/pms/otp/send/+server.ts`, `src/routes/api/pms/otp/verify/+server.ts`

`otp/send` has an in-band cooldown via `otpStore.exists()` but no per-IP `rateLimit()` call. `otp/verify` has zero rate limiting — an attacker can brute-force a 6-digit OTP (1M attempts) at API speed. The pipeline endpoint correctly uses `rateLimit()` at line 43-48; the OTP endpoints must do the same.

**Fix**: Add `rateLimit(ip, { maxRequests: 5, windowMs: 60_000, identifier: 'pms_otp_send' })` on send, `rateLimit(ip, { maxRequests: 3, windowMs: 900_000, identifier: 'pms_otp_verify' })` on verify.

#### H-3: No rate limiting on 6 mutation endpoints

**Files**: `policies/[id]/approve`, `reject`, `revise`, `submit/+server.ts`, `lender-assignments/onboard`, `transfer/+server.ts`

None of these admin/RM mutation routes call `rateLimit()`. The pipeline endpoint demonstrates the correct pattern. Approve/reject/submit are lower-risk but revise and onboard create DB documents without throttle.

**Fix**: Add `rateLimit()` to all six endpoints, following the pipeline's pattern.

#### H-4: Prompt injection — raw PDF text injected into LLM prompts

**File**: `src/lib/server/pms/aiPipeline.ts:143,215,284,355,426`

In every pass, `sourceText` is injected verbatim into the `user` role message with no sanitization. A malicious PDF containing `"Ignore all previous instructions..."` is passed directly to the model. Risk is narrowed by `response_format: json_object` and `temperature: 0`, but non-zero. No pre-screening or sentinel framing is present.

**Fix**: Add a hard prefix sentinel to the system prompt and/or strip lines matching common injection patterns before passing to the model.

#### H-5: Token circuit breaker reads stale counter for passes 3–6

**File**: `src/routes/api/pms/pipeline/+server.ts:84-88,258-263`

The 100k token circuit breaker reads `policy.aiPipelineRun?.totalTokensUsed` once at request start. Passes 3–6 update the total via `$inc` on MongoDB but the check is never re-evaluated. Two concurrent pass-3 requests can each pass the 100k check and together exceed it.

**Fix**: Re-read `totalTokensUsed` after each pass completes and abort if the cumulative total exceeds the limit.

---

### MEDIUM

#### M-1: `verifyWithContext` has attempt-counting hole

**File**: `src/lib/services/otpStore.ts:289-327`

On context mismatch, the OTP document is deleted (lines 319-323) without incrementing `attempts`. An attacker can repeatedly call with mismatched contexts to probe whether an OTP exists without consuming any of their 5 attempts.

**Fix**: Count context-mismatch failures as attempts before deleting, or perform a single atomic find with context validation inside `verify`.

#### M-2: `clauseComments` written to DB without field-level validation

**File**: `src/routes/api/pms/policies/[id]/reject/+server.ts:45-49`

`clauseComments` array is written directly to MongoDB with no validation of element count, string lengths, or that `clauseId` values reference real clauses. The outer `rejectionNote` has a 1000-char cap, but clause comments have none.

**Fix**: Validate `clauseComments.length <= 100` and `comment.length <= 500` before the DB write.

#### M-3: `upsertAdminClauseComment` is not atomic — race condition

**File**: `src/lib/server/pms/policyService.ts:475-481`

The `$pull` and `$push` for updating an admin clause comment are two separate `updateOne` calls with no transaction. A concurrent writer between them can produce a double entry or missing entry.

**Fix**: Use a single `updateOne` with `$pull` + `$push` in the same operation, or use `arrayFilters` with `$set`.

#### M-4: `clearApplicationFields` fires before resume modal is actioned

**Files**: `src/routes/(app)/form/home-loan/+page.svelte:761`, `lap/+page.svelte:399`, `plot-loan/+page.svelte:682`

When `showResumeModal` is true, `clearForLoanType` and `clearApplicationFields` are called even though the resume modal hasn't been actioned yet. If the user picks "Resume", their prior product-specific keys are already gone.

**Fix**: Guard with `if (!showResumeModal)` and call them again in `handleResumeChoice('clear')`.

#### M-5: `replacementRmUserId` accepted without existence check

**File**: `src/routes/api/pms/lender-assignments/transfer/+server.ts:28-38`

`replacementRmUserId` is used directly in `insertOne` without verifying the replacement RM exists in `rmApplications`. An admin typo silently creates an assignment and notification for a non-existent user.

**Fix**: Verify `replacementRmUserId` exists in `rmApplications` before creating the assignment.

#### M-6: `nextVerificationDueBy` accessed without null guard

**File**: `src/routes/dashboard/rm/policies/+page.server.ts:19`

If any assignment document has a missing `nextVerificationDueBy`, `.getTime()` throws TypeError, crashing the entire load function (500 to RM). Possible for records created before the field was mandatory.

**Fix**: Add `a.nextVerificationDueBy?.getTime() ?? now.getTime()` fallback.

#### M-7: `parseJsonResponse` leaks partial LLM output to client

**File**: `src/lib/server/pms/aiPipeline.ts:98`

Error message includes `stripped.slice(0, 300)` of raw LLM response. This propagates to `apiError()` (returned to browser) and is persisted to `pipelineState.errorState.message` in MongoDB. If the PDF contained PII, it could appear in error output.

**Fix**: Omit raw content from the error message. Log it server-side only at `debug` level.

---

### LOW

#### L-1: `pristineSectionsJson` uses `JSON.stringify` for dirty detection

**File**: `src/routes/dashboard/rm/policies/[lenderId]/[product]/edit/+page.svelte:23`

`JSON.stringify` drops `undefined` values silently. If a form sub-component resets a field to `undefined` instead of `null`, dirty detection will produce false negatives.

**Fix**: Use `securedEquals()` from `$lib/utils/securedClone`, or ensure all optional fields default to `null`.

#### L-2: Admin onboard-lender page queries by admin's own ID

**File**: `src/routes/dashboard/rm/policies/onboard-lender/+page.server.ts:9-17`

Guard allows `['rm', 'admin']` but `assignedLenderIds` is always built from `locals.user!.id`. Admin sees every lender as unassigned because the query matches the admin's (empty) assignments.

**Fix**: Skip `assignedLenderIds` lookup when `isAdmin`, or remove `admin` from the guard.

#### L-3: Edit page `window.location.reload()` after save — timer leak + UX jank

**File**: `src/routes/dashboard/rm/policies/[lenderId]/[product]/edit/+page.svelte:99-101`

`setTimeout(() => window.location.reload(), 600)` destroys the component before the `saveSuccess` clear timer at 4000 ms can run. Double-click can race two saves.

**Fix**: Use `invalidateAll()` from `$app/navigation` instead of `window.location.reload()`. Drop the 4000 ms timer.

---

## Summary

| Severity | Count | Key themes |
|----------|-------|------------|
| CRITICAL | 3 | Weak OTP generation, non-expiring HMAC tokens, unvalidated LLM output |
| HIGH | 5 | Key separation, missing rate limits, prompt injection, stale circuit breaker |
| MEDIUM | 7 | Attempt-counting hole, unvalidated inputs, race conditions, data loss on resume |
| LOW | 3 | Dirty detection, admin page query, reload jank |

The PMS feature build (Phases 0–5) is architecturally sound — auth guards are consistently applied, `apiOk()`/`apiError()` used throughout, no bare `console` in server code, no module-scope fetches, no XSS (`{@html}` absent). The findings are concentrated in the OTP/token chain (C-1, C-2, H-1, H-2) and the AI pipeline trust boundary (C-3, H-4, H-5, M-7). The form fixes (S84, F4-D, NB-4) are clean except for the resume-modal timing issue (M-4).

**Priority recommendation**: Fix C-1 + C-2 + H-2 as a single commit (OTP hardening). Then H-1 (key separation) and C-3 (Zod schemas for LLM output). The remaining items can be addressed incrementally.
