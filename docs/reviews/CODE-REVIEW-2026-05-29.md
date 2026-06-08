# Code Review — 2026-05-29

**Scope:** Commits from 2026-05-14 through 2026-05-29 (baseline: `catch-audit-2026-05-13.md`)
**Top of tree at review time:** `3083137d`
**Prior daily review:** `CODE-REVIEW-2026-05-28.md` (baseline `023512a0`, 45-commit day, full T1-T9 sweep — no Critical/High findings)
**Reviewer:** automated `feature-dev:code-reviewer` agent

Workstreams covered: D.1 S1-S8 (recurring billing), D.2 invoicing, D.6 pricing fence (4 slices + annual-billing revert), Tier 3b guarantor eligibility, auth deep-link redirect fix + open-redirect closure, Pitfalls #46-#63 additions, RM questionnaire audit, rule engine audit sweep, archived route stubs.

> **Post-baseline update (2026-05-29 doc-hygiene sweep):** Finding **M2** (`refund_issued` / `status.refund_processing` dead code) was **closed out in commit `d6e83b2b`** after this review ran. M2 entry retained below for the audit trail.

| Metric | Value |
|--------|-------|
| Tests (top of tree per 2026-05-28 review) | 12,584 — 0 failures |
| Type errors | 0 |
| High-confidence findings (≥ 80) | 7 (1 resolved post-baseline) |
| Pitfall #64 candidate confirmations | 2 — both promoted to PITFALLS.md as #64 / #65 in commit pending |

---

## Critical Findings

None.

---

## High-Priority Findings

### H1 — Trial disclosure copy hardcodes `"30 days"` — bypasses `TRIAL_DAYS` SSOT constant

**Confidence:** 95
**Files:**
- `src/routes/api/billing/subscribe-recurring/+server.ts:287`
- `src/lib/components/billing/SubscribeRecurringSection.svelte:503`
- `src/lib/components/billing/SubscribeRecurringSection.svelte:508`

`$lib/config/billing.ts` introduced `export const TRIAL_DAYS = 30` on 2026-05-28 with an explicit comment calling it "SINGLE SOURCE OF TRUTH" that "replaces local shadow constants." The webhook handler and subscribe endpoint use `TRIAL_DAYS` for all date arithmetic. But three user-visible copy strings were missed:

`subscribe-recurring/+server.ts:287`:
```typescript
? `Free for 30 days. On ${firstCharge.toDateString()} we will charge ...`
```

`SubscribeRecurringSection.svelte:503,508`:
```svelte
<strong>Free for 30 days.</strong> On day 30 your card/UPI is auto-charged
<strong>Cancel anytime in the 30 days</strong> from the Manage panel
```

If `TRIAL_DAYS` is changed (promotional shortening, A/B test), the date arithmetic shifts correctly but the disclosure modal still says "30 days" — the exact drift the consolidation was meant to prevent. The comment in the server file even says "Free for 30 days" should track the constant.

**Fix:** Interpolate `TRIAL_DAYS` into all three strings. `TRIAL_DAYS` is already imported in `subscribe-recurring/+server.ts`; `SubscribeRecurringSection.svelte` needs an import from `$lib/config/billing`.

---

### H2 — Two Pitfall #43 CI tests referenced in CLAUDE.md §4 do not exist

**Confidence:** 100
**Missing files:**
- `src/lib/testing/__tests__/affordabilityScenarioGating.test.ts`
- `src/lib/testing/__tests__/propertyNotIdentifiedTrafficLight.test.ts`

CLAUDE.md §4 instructs:
```
pnpm test:unit -- --run affordabilityScenarioGating propertyNotIdentifiedPayload propertyNotIdentifiedTrafficLight
```

`propertyNotIdentifiedPayload.test.ts` exists; the other two do not. The Pitfall #43 enforcement is one-third covered. The missing tests cover: (a) affordability scenario cards gated by `selectAffordabilityScenarios` (not auto-computed), and (b) traffic-light behavior when `propertyIdentified === false` vs explicit `'No'`. Pitfall #43 specifically warns about the coerced-boolean false positive (`toBoolean(undefined) === false` making LAP/Plot look unidentified).

**Fix:** Create the two missing test files following the source-pattern-scan model in `propertyNotIdentifiedPayload.test.ts`. Lock `evaluationEngine.ts`'s `selectAffordabilityScenarios` gate and the explicit-`'No'` branch separately.

---

## Medium Findings

### M1 — `billing_cycle: 'monthly' | 'yearly'` in `BillingSubscriptionDoc` is a dead type variant

**Confidence:** 88
**File:** `src/lib/types/billingSubscription.ts:79`

Annual billing was removed 2026-05-28 per owner decision. `billing.ts` documents the removal; `pricingFenceHelpers.test.ts` locks that `BillingCycle`, `getAnnualPrice`, `getAnnualSavings` remain unexported. However `BillingSubscriptionDoc.billing_cycle` still types as `'monthly' | 'yearly'`. Every actual write site (`subscriptionState.ts:316`) hardcodes `'monthly'`. No query, migration, or handler reads `'yearly'`.

The dead variant is a type lie: TypeScript allows constructing a `BillingSubscriptionDoc` with `billing_cycle: 'yearly'` without complaint, but no such document can ever exist in the live system. A future developer writing a test fixture or migration script could use `'yearly'` and pass type checking without error.

**Fix:** Narrow `billing_cycle` to `'monthly'` in `billingSubscription.ts:79`. Same for `BillingProvider.ts:25` (`frequency: 'monthly' | 'yearly'` — only `'monthly'` is ever passed).

---

### M2 — `refund_issued` and `status.refund_processing` are orphaned dead code from D.3 refund abandonment ✅ RESOLVED post-baseline

**Confidence:** 85
**Status: CLOSED in commit `d6e83b2b` (2026-05-29).**

Files were:
- `src/lib/types/policyEngine.ts:157` — `| 'refund_issued'` in `AuditAction` union
- `src/lib/i18n/en.ts:403`, `src/lib/i18n/hi.ts:400`, `src/lib/i18n/mr.ts:400` — `'status.refund_processing'` key
- `src/routes/dashboard/admin/audit/+page.svelte:48,95` — display filter + colour map

All removed in `d6e83b2b`. `target_type: 'payment' | 'refund'` retained as live (auditLog.ts comment treats them as live for 6-year retention; ad-hoc manual refunds via Razorpay dashboard could still be logged against those target types).

---

### M3 — `verify-otp` server makes a redundant `check-dsa` call whose tokens are immediately overwritten

**Confidence:** 82
**File:** `src/routes/api/auth/verify-otp/+server.ts:91-95`

The `verify-otp` endpoint internally calls `check-dsa` via SvelteKit's internal `fetch`. This sub-request: reads `DsaApplications`, generates a JWT token pair, writes `activeTokenId` + `refreshToken` to the DB, and sets httpOnly cookies. The endpoint only uses the `userData.userExists` field and sets a `role` cookie if the user is new.

Then the client `loginWithRole` (login `+page.svelte:440`) calls `check-dsa` directly, generating a second token pair with a second DB write and overwriting the first cookies. The first token pair's DB row is now permanently stale — it was never used for a request and will sit in `activeTokenIds` until it expires.

Result per login: 2 `check-dsa` calls, 2 token DB writes, 1 stale token row. No security impact (stale token was never sent to client), but unnecessary overhead and clutters token revocation lists.

**Fix:** Remove the internal `check-dsa` call from `verify-otp`. Its only remaining job is MSG91 OTP verification and setting `verifiedMobile` + optionally `role` cookies. Token generation belongs in the explicit `loginWithRole → check-dsa` call that runs once the role is known.

---

## Low Findings / Observations

### L1 — `subscription/status` rate limit (prior M4 carried for 3 days) — RESOLVED

`subscription/status/+server.ts` now applies `rateLimit(userId, { identifier: 'billing-status:...', maxRequests: 60, windowMs: 60_000 })` at line 37. No longer a finding.

### L2 — Disclosure copy comment says "30-day" but the constant says `TRIAL_DAYS`

**File:** `src/routes/api/billing/subscribe-recurring/+server.ts:281`

The inline comment above the `disclosure` block reads: *"Trial path swaps the second line to set the 30-day free-then-charge expectation"*. This comment should reference `TRIAL_DAYS` rather than hardcoding `30-day` — once H1 is fixed, the comment will be the last remaining literal. Minor, but worth fixing in the same pass.

### L3 — `SubscriptionStatus` in `billing.ts` is legacy-only but not labelled as such

**File:** `src/lib/config/billing.ts:12`

`export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled'` is the legacy one-time-payment model type (consumed by `DsaSubscription`). The D.1 state machine uses `SubscriptionState` from `billingSubscription.ts`. The two types coexist without any cross-reference note. A developer looking at billing types will see both and may not know which belongs to D.1 vs pre-D.1.

**Suggested action:** Add a comment above `SubscriptionStatus` in `billing.ts` saying it's the pre-D.1 legacy type and is distinct from `SubscriptionState` in `billingSubscription.ts`. No code change required.

### L4 — 2 dead-code `// //console.log` lines (pre-existing, carried)

**Files:** `src/routes/api/auth/init-widget/+server.ts`, `src/routes/api/auth/resend-otp/+server.ts`

Double-commented console.log lines — harmless dead code. Clean up next time these files are touched.

---

## CLAUDE.md §4 Grep Summary

| Check | Result |
|-------|--------|
| Pitfall #1 JSON-Logic `!=` | 1 hit in `_archive/` — inactive. 0 active violations. |
| Pitfall #4 module-scope fetch | 0 violations |
| Pitfall #9 `typeof window` SSR guard | 0 violations |
| Pitfall #13 combinedAnswers collision | 0 violations |
| Pitfall #15 unsanitized `{@html}` | 0 violations (10 total, all `sanitizeHtml` or `_archive`) |
| Pitfall #28 TanStack `$`-prefix | 0 violations |
| Pitfall #38 loan-switch chokepoint | 0 violations |
| Pitfall #42 reload detection | 0 violations |
| Pitfall #43 — `affordabilityScenarioGating.test.ts` | **MISSING** (H2) |
| Pitfall #43 — `propertyNotIdentifiedTrafficLight.test.ts` | **MISSING** (H2) |
| Pitfall #43 — `propertyNotIdentifiedPayload.test.ts` | Present |
| Pitfall #46 `directorAutoIncomeWiring.test.ts` | Present |
| Pitfall #47 `preSubmitConfirmWiring.test.ts` | Present |
| Pitfall #54 JWT scheduler in `(app)/+layout.svelte` | Both names present |
| Pitfall #55 `inputFieldOnInputWiring.test.ts` | Present |
| Pitfall #56 `directorStakeRecompute.test.ts` | Present |
| Pitfall #57 `nriIncomeStash.test.ts` | Present |
| Pitfall #58 `companyDCObligationGate.test.ts` | Present |
| Pitfall #59 `tokenRefreshScheduler.test.ts` | Present |
| Pitfall #61 `chargeEngineIdempotency.test.ts` | Present |
| Pitfall #62 `incomeProfileSelectorAutoDrop.test.ts` | Present |
| Pitfall #63 `archivedRouteStubInvariant.test.ts` | Present; all 4 `_archived_*` billing routes are clean 410 stubs |
| Bare `console.*` in server/API routes | 0 violations |
| `Co-Authored-By` in commits (2-week window) | 0 trailer lines |

**All Pitfall #46-#63 test files exist** except the Pitfall #43 pair noted in H2.

---

## Security Surface Summary

### Auth — open-redirect closure (commits `012005b7`, `0372e6c6`)

`safeRedirectPath` and `isSafeRedirectPath` in `src/lib/utils/safeRedirectPath.ts` enforce strict same-origin-path validation: single leading `/`, no `//`, no `\`, no `/api/` prefix, URL-parser origin check against a dummy placeholder.

All four `window.location.href` assignments in `loginWithRole` that accept user-supplied `redirectUrl` use `safeRedirectPath(redirectUrl, dashboardPath)` or `isSafeRedirectPath(redirectUrl)`. The legacy `isSafeRedirect` (host-allowlist, path not validated) is removed. No open-redirect surface remains in the login flow.

The raw `fetch()` calls on the login page for auth endpoints are intentional: `send-otp`, `verify-otp`, `detect-roles`, `signup`, `demo-login`, `check-dsa` are all in the CSRF-exempt list (`hooks.server.ts:570-591`). CSRF protection is not applicable to pre-auth endpoints.

### Billing — charge cron idempotency (Pitfall #61)

`chargeEngine.ts` is fully compliant:
- `probeExistingAttempt` (lines 197-239) runs before every `chargeMandate` call — Step 3 at line 397
- Pending `ChargeAttempt` row inserted BEFORE provider call — Step 5 at line 438
- E11000 duplicate-key catch-and-bail at lines 460-476 handles the true concurrent race that application-layer probes cannot
- `'in_flight'` path (lines 413-431) handles cron + manual-retry-now concurrent firing
- `chargeEngineIdempotency.test.ts` locks all four invariants via static-scan

### Rule engine — guarantor capacity assessment (Tier 3b, commit `c951ed09`)

`evaluationEngine.ts:1195-1200` uses `assessed_amount` for guarantor capacity, not `final_amount`. This is correct — `final_amount` is 0 for guarantors by design (income not pooled into borrower eligibility). `guarantorEligibilityAssessment.test.ts` locks this invariant. The `null` policy threshold (lender refuses guarantors entirely) is correctly handled at line 1181. GREEN→AMBER demote never escalates a non-green result.

---

## Pitfall #64 Candidate Evaluations

The session handoff flagged two candidates. Both promoted to PITFALLS.md as #64 and #65 in the 2026-05-29 doc-hygiene sweep.

### Candidate A — `assessed_amount` vs `final_amount` in guarantor capacity → Pitfall #64

**Verdict: Correct as implemented. Not a bug.**

`evaluationEngine.ts:1200` sums `assessed_amount` (gross income after haircut) for the capacity formula. `final_amount` is 0 for guarantors by design (`incomeAssessorV2.ts:196`) because their income must not inflate the borrower's pool. Using `assessed_amount` is intentional and spec-correct. The `guarantorEligibilityAssessment.test.ts` Layer 1 invariant test (line ~29) explicitly locks that `assessed_amount` is read, not `final_amount`.

Promoted as **Pitfall #64** documenting the pattern — future reviewers will see `assessed_amount` and `final_amount` in `income_sources` and may wonder why the guarantor path uses the former. The note prevents a well-meaning "fix" that would break guarantor capacity to zero.

### Candidate B — "UX-bug investigations should grep for adjacent security smells" → Pitfall #65

**Verdict: Valid process guidance, confirmed by the auth-redirect fix history.**

The `isSafeRedirect` function in the prior codebase checked the host but never validated the path, and was never called at the actual navigation site. The UX bug surface (confusing redirect behavior) was adjacent to a real open-redirect security issue. The investigation of the UX symptom surfaced the security root cause.

Promoted as **Pitfall #65** — heuristic, no CI lock. Apply on any file under `src/routes/**/(login|signup|auth|onboarding)/**` or any code importing from `$app/navigation` that does `window.location.href =` or `goto(`.

### Bonus — Pitfall #66 (added in same sweep): negative-check regex usage shapes

Three independent occurrences on 2026-05-29 of bare-identifier negative-check regexes that trip on in-place removal-decision comments. Promoted as **Pitfall #66** — test-design rule, no grep, applied at PR review.

---

## Top Actions (priority order)

1. ~~Remove `refund_issued` + `status.refund_processing` orphaned dead code (M2, 4 files)~~ ✅ DONE in `d6e83b2b`
2. Fix 3 hardcoded `"30 days"` literals in trial disclosure copy — `subscribe-recurring/+server.ts:287` and `SubscribeRecurringSection.svelte:503,508` (H1, 1-line fix each)
3. Create `affordabilityScenarioGating.test.ts` and `propertyNotIdentifiedTrafficLight.test.ts` to complete Pitfall #43 CI coverage (H2)
4. Narrow `billing_cycle` / `frequency` dead `'yearly'` variants in `billingSubscription.ts:79` and `BillingProvider.ts:25` (M1)
5. Consider removing redundant `check-dsa` call from `verify-otp` server (M3, no urgency — no security impact)
6. Add `SubscriptionStatus` legacy label in `billing.ts` (L3, comment-only change)

---

*Report generated 2026-05-29. No source code modified during review.*
