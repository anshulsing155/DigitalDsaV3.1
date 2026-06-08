# Code Review — March 10, 2026

**Commits reviewed:** 5 commits since March 9 review
**Authors:** Sudhanshu Kansal (1), Prashant/Claude (4)

| Commit     | Author           | Description                                                                                                  |
| ---------- | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `344ecd08` | Sudhanshu Kansal | Applicant data sync doc, credit score fix, loan requirements showWhen changes                                |
| `2036ad7e` | Prashant         | feat: add progressive policy capture form for RMs                                                            |
| `b967782b` | Prashant         | fix: 4 bug fixes — walkthrough persistence, login redirect, income applicant index, how-can-we-help sidebars |
| `c6ff6a9d` | Prashant         | fix: Next button not working on multi-applicant Profile & Financials page                                    |
| `91d17628` | Prashant         | fix: RM verify-email fallback + redesign ConditionalRuleEditor as rate cards                                 |

---

## CRITICAL — Fix Immediately

### 1. loanRequirements.ts: BT With Top-up Flow Broken in Question Bank

**Author:** Sudhanshu Kansal
**Commit:** `344ecd08`
**File:** `src/lib/config/homeLoan/questionBank/loanRequirements.ts`
**Confidence:** 100%

The TypeScript question bank now diverges from the canonical `homeLoanSchemaV2.json` in a way that will break the "Balance Transfer With Top-up" flow if the schema is ever recompiled.

**What changed (all wrong):**

| Question                              | Before (correct)                                         | After (broken)                         |
| ------------------------------------- | -------------------------------------------------------- | -------------------------------------- |
| `q3_showResultOfBtWithTopUp` showWhen | `loanType === 'Balance Transfer With Top-up'`            | `loanType === 'Balance Transfer Only'` |
| `q4_topUpTenure` showWhen             | `'Top-up Only' OR ('BT With Top-up' AND showResult=Yes)` | `'Top-up Only'` only                   |
| `q5_topUpAmount` showWhen             | Same OR pattern                                          | `'Top-up Only'` only                   |
| `q6_topUpPurpose` showWhen            | Same OR pattern                                          | `'Top-up Only'` only                   |

**Impact:** The question "Do you want a top-up with the BT?" now shows for "Balance Transfer Only" (where it makes no sense — user already said no top-up). All top-up detail fields (tenure, amount, purpose) are completely hidden for "Balance Transfer With Top-up" users.

**Why this matters now:** The JSON schema (`homeLoanSchemaV2.json`) still has the correct logic, so the live form works. But if `getLoanRequirementsQuestions()` is ever run through the schema composition pipeline, it will overwrite the correct JSON with this broken logic.

**Fix:** Revert all showWhen changes in `loanRequirements.ts` to match `homeLoanSchemaV2.json`.

---

### 2. Policy Capture PATCH/DELETE: Write Operations Missing `rm_id` in Filter (TOCTOU)

**Author:** Prashant
**Commit:** `2036ad7e`
**Files:**

- `src/routes/api/rm/policy-captures/[capture_id]/+server.ts` (lines 71, 99)
- `src/routes/api/rm/policy-captures/[capture_id]/submit/+server.ts` (line 46)
  **Confidence:** 95%

Authorization check (`findOne`) correctly scopes by both `capture_id` and `rm_id`. But the subsequent `updateOne`/`deleteOne` only filters by `capture_id`:

```typescript
// PATCH — rm_id missing in write filter
await PolicyCaptures.updateOne(
	{ capture_id: params.capture_id }, // should include rm_id
	{ $set: update }
);

// DELETE — rm_id missing
await PolicyCaptures.deleteOne({ capture_id: params.capture_id });
```

**Fix:** Add `rm_id: rmDoc._id.toString()` to all write operation filters.

---

### 3. Policy Capture PATCH: `data.*` Keys Written Without Allowlist

**Author:** Prashant
**Commit:** `2036ad7e`
**File:** `src/routes/api/rm/policy-captures/[capture_id]/+server.ts` (lines 64-68)
**Confidence:** 90%

Any client-supplied string key is accepted as a `data.<key>` field in the MongoDB `$set`:

```typescript
for (const [key, value] of Object.entries(dataUpdate)) {
	update[`data.${key}`] = value; // no validation on key names
}
```

An RM can write arbitrary fields into the document. Fix with an allowlist:

```typescript
const VALID_DATA_KEYS = new Set([
	'core_parameters',
	'eligibility',
	'credit_cibil',
	'income_assessment',
	'property_rules',
	'obligations',
	'bt_topup',
	'fees_policies',
	'deviations',
	'special_conditions'
]);
```

---

### 4. Policy Capture PATCH: `completed_steps` Array Not Element-Validated

**Author:** Prashant
**Commit:** `2036ad7e`
**File:** `src/routes/api/rm/policy-captures/[capture_id]/+server.ts` (lines 53-55)
**Confidence:** 92%

`Array.isArray()` check passes, but individual elements are not validated. Client can send strings, floats, NaN, or negative numbers. Also `completion_percent` and `current_step` accept any number without range checks.

**Fix:**

```typescript
if (
	Array.isArray(body.completed_steps) &&
	body.completed_steps.every(
		(s) => typeof s === 'number' && Number.isInteger(s) && s >= 0 && s <= 9
	)
) {
	update.completed_steps = body.completed_steps;
}
if (
	typeof body.completion_percent === 'number' &&
	body.completion_percent >= 0 &&
	body.completion_percent <= 100
) {
	update.completion_percent = body.completion_percent;
}
```

---

## IMPORTANT — Fix This Week

### 5. CreditScoreSection: `handleEnquiryCountChange` Checks Wrong Value for "None"

**Author:** Pre-existing bug (highlighted by Sudhanshu's commit `344ecd08`)
**File:** `src/lib/components/CreditScoreSection.svelte` (line 223)
**Confidence:** 85%

The clear-reason logic checks `val === '0'` but the "None" radio option has `value: 'none'`:

```typescript
function handleEnquiryCountChange(val: string) {
	recentEnquiryCount = val;
	if (val === '0' || val === '1_2') enquiryReason = ''; // '0' never matches
}
```

**Fix:** Change `'0'` to `'none'`:

```typescript
if (val === 'none' || val === '1_2') enquiryReason = '';
```

Sudhanshu's new `&& recentEnquiryCount !== ""` check in `showEnquiryReason` is correct — it prevents the reason field from showing before any selection. But the stale-data clearing bug remains.

---

### 6. `verify-email` API Uses Bare `json()` and `console.log` Throughout

**Author:** Pre-existing (touched in `91d17628` without fixing)
**File:** `src/routes/api/rm/verify-email/+server.ts`
**Confidence:** 88%

Entire file uses raw `json()` from `@sveltejs/kit` instead of `apiOk()`/`apiError()`/`apiServerError()`. Also has `console.log` instead of `logger`. Per CLAUDE.md conventions, all server routes must use the centralized response helpers and structured logger.

---

### 7. docs/SUDHANSHU.md: Personal Note Committed to Shared Docs

**Author:** Sudhanshu Kansal
**Commit:** `344ecd08`
**File:** `docs/SUDHANSHU.md`
**Confidence:** 90%

A 4-line personal bug description named after the developer. Should be a GitHub issue or entry in CHANGELOG.md, not a standalone file in `docs/`.

**Action:** Delete the file. The bug is documented in this review.

---

### 8. Login Redirect Missing `property_consultant` Role

**Author:** Prashant
**Commit:** `b967782b`
**File:** `src/routes/(auth)/login/+page.server.ts` (lines 4-8)
**Confidence:** 83%

```typescript
const ROLE_DASHBOARD: Record<string, string> = {
	dsa: '/dashboard/dsa',
	rm: '/dashboard/rm',
	admin: '/dashboard/admin'
	// property_consultant missing
};
```

PropertyConsultant users silently fall through to the DSA dashboard. If intentional (PC features soft-disabled), add a comment. If not, add the route mapping.

---

### 9. `geo_state`/`geo_city` Accepted Without Length Validation

**Author:** Prashant
**Commit:** `2036ad7e`
**File:** `src/routes/api/rm/policy-captures/+server.ts` (lines 115-116)
**Confidence:** 80%

Optional fields written to DB without any length bounds. Add `body.geo_state.length <= 100` check.

---

## LOW — Note for Future

### 10. IncomePageNew `currentApplicantIndex` Fix Is Defensive Only

**Author:** Sudhanshu Kansal
**Commit:** `344ecd08`
**File:** `src/lib/components/IncomePageNew.svelte` (line 643)

The added `currentApplicantIndex={selectedIndex}` in the single-applicant code path is harmless but doesn't fix the shared-state bug described in SUDHANSHU.md. In the single-applicant path, `selectedIndex` is always `0`, matching the existing `?? 0` fallback. The root cause (shared object references between applicants) requires investigation in how `formState.applicants` are constructed.

---

## Summary

| #   | Severity     | Author       | Issue                                                   | Action                           |
| --- | ------------ | ------------ | ------------------------------------------------------- | -------------------------------- |
| 1   | **Critical** | Sudhanshu    | BT With Top-up showWhen logic inverted in question bank | Revert showWhen changes          |
| 2   | **Critical** | Prashant     | TOCTOU — write ops missing `rm_id` filter               | Add `rm_id` to all write filters |
| 3   | **Critical** | Prashant     | Arbitrary `data.*` keys accepted                        | Add allowlist                    |
| 4   | **Critical** | Prashant     | `completed_steps` elements not validated                | Add type/range check             |
| 5   | Important    | Pre-existing | `enquiryReason` never cleared for "None"                | Fix `'0'` → `'none'`             |
| 6   | Important    | Pre-existing | `verify-email` uses bare json()/console                 | Migrate to apiOk/logger          |
| 7   | Important    | Sudhanshu    | Personal doc committed                                  | Delete `docs/SUDHANSHU.md`       |
| 8   | Important    | Prashant     | Login redirect missing PC role                          | Add mapping or document intent   |
| 9   | Important    | Prashant     | geo fields unbounded                                    | Add length check                 |
| 10  | Low          | Sudhanshu    | Income fix is no-op in single-applicant path            | Investigate root cause           |

**Previous review findings status:**

- Review #1 (March 9): `.env` exposure still unresolved (deferred to post-launch per user)
- Review #2 (March 9): Income profile type string mismatch — check if `c1bb995d` fixed this
