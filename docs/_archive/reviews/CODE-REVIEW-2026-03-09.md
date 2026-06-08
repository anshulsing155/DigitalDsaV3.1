# Code Review — March 9, 2026

**Commits reviewed:** 15 commits since Feb 27
**Reviewers:** Automated + manual audit

---

## CRITICAL — Fix Immediately

### 1. `.env` Still Tracked in Git — 19 Live Secrets Exposed

**Commit:** `48059c50`

The `.env` file is still being tracked by git despite `.gitignore`. Every `git clone` delivers all credentials in plaintext:

| Secret                           | Risk                                               |
| -------------------------------- | -------------------------------------------------- |
| Razorpay LIVE keys (`rzp_live_`) | Financial fraud — anyone can create payment orders |
| MongoDB Atlas credentials        | Full database read/write/delete                    |
| JWT + refresh secrets            | Forge valid auth tokens, permanent sessions        |
| HMAC + Encryption keys           | Decrypt data at rest, forge signed payloads        |
| MSG91 auth keys                  | Send OTPs billed to our account                    |
| ImageKit private key             | Delete/overwrite all uploaded media                |
| SMTP password (`Password@123`)   | Send emails as support@digitaldsa.com              |
| Google AI API key                | Billed usage, quota exhaustion                     |
| `VITE_HMAC_SECRET`               | Bundled into client JS — visible to every browser  |

**What to do:**

```bash
# Step 1: Stop tracking .env
git rm --cached .env
git commit -m "stop tracking .env"

# Step 2: Rotate ALL credentials in each provider's console
# (Atlas, Razorpay, MSG91, ImageKit, JWT secrets, SMTP, Google AI)

# Step 3: Purge from git history (after rotating)
pip install git-filter-repo
git filter-repo --path .env --invert-paths

# Step 4: Force push, everyone re-clones
```

> The `.gitignore` rule exists but git ignores it for already-tracked files. This has happened 19+ times.

---

### 2. Missing CSRF Protection on Dashboard API Calls

**Author:** Mrityunjay

Several `POST`/`PATCH` calls in the case dashboard use bare `fetch()` instead of `secureFetch()`. This means an attacker can craft a page that silently changes case data for a logged-in DSA.

**Affected files:**

| File                                                 | Line     | Action                   |
| ---------------------------------------------------- | -------- | ------------------------ |
| `dashboard/dsa/cases/[case_id]/+layout.svelte`       | 65       | Stage change (PATCH)     |
| `dashboard/dsa/cases/[case_id]/+page.svelte`         | 166      | Add lender (POST)        |
| `dashboard/dsa/cases/[case_id]/+page.svelte`         | 240      | Save contact (PATCH)     |
| `dashboard/dsa/cases/[case_id]/+page.svelte`         | 277, 318 | Other mutations          |
| `dashboard/dsa/cases/[case_id]/results/+page.svelte` | 144      | Lender selection (PATCH) |

**Fix:** Replace `fetch()` with `secureFetch()` from `$lib/utils/csrf` on all `POST`/`PATCH`/`DELETE` calls:

```diff
- const res = await fetch(`/api/cases/${caseData.case_id}/stage`, {
+ const res = await secureFetch(`/api/cases/${caseData.case_id}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage: newStage })
  });
```

---

### 3. `mapLoanType()` Uses Wrong Data Source

**Authors:** Mrityunjay, Sudhanshu

In all 3 unsecured loan pages, `ObligationsRunning` is resolved correctly for the `loanTransaction` object (reads from applicant store with fallback), but the immediately following `mapLoanType()` call bypasses that and reads from `combinedAnswers` which may be stale or undefined.

**Affected files:**

- `professional-loan/+page.svelte` — lines 574-577
- `personal-loan/+page.svelte` — lines 769-772
- `business-loan/+page.svelte` — lines 674-677

**Fix:** Extract the resolved value into a variable, use it for both:

```typescript
const resolvedObligations =
  (formState.applicants[0] as any)?.ObligationsRunning ||
  combinedAnswers.ObligationsRunning ||
  'No';

loanTransaction: {
  ObligationsRunning: resolvedObligations,
  LoanType: mapLoanType(
    combinedAnswers.loanType?.toString(),
    resolvedObligations  // <-- use same resolved value
  ),
```

---

## HIGH — Fix This Week

### 4. Professional Practice Income Profile Hidden (Circular Dependency)

**Author:** Rishabh
**File:** `src/lib/config/incomeProfiles/profileCards.ts` — line 81

The `professional_practice` card requires `education === "professional"` to be visible. But in the Professional Loan single-applicant flow, the DSA hasn't set `education` yet when the income profile selector appears. This means **DSAs cannot select "Professional Practice"** — the primary income type for Professional Loans.

**Fix (one-line change):**

```diff
  showWhen: {
-   and: [{ '==': ['isApplicantNRI', 'No'] }, { '==': ['education', "professional"] }]
+   and: [
+     { '==': ['isApplicantNRI', 'No'] },
+     { or: [{ '==': ['education', 'professional'] }, { '==': ['loanCategory', 'professional'] }] }
+   ]
  }
```

The `answersContext` already includes `loanCategory: 'professional'` from `applicationData`, so this works without other changes.

---

### 5. `{@html}` Rendering Without Sanitization

**Author:** Mrityunjay

`pageTitle` and `pageDescription` from JSON schemas are rendered via `{@html}` in all loan form pages. While schemas are static files today, this is a standing XSS risk if content ever becomes dynamic.

**Fix:** Use plain text binding for titles, keep `{@html}` only for descriptions that intentionally contain HTML:

```diff
- {@html serverPage?.pageTitle || 'Loan Application'}
+ {serverPage?.pageTitle || 'Loan Application'}
```

---

### 6. Snapshot Data Loaded Without Protection

**Authors:** All

All 6 loan form pages load edit-mode snapshot data directly into reactive state:

```typescript
formState.fromJSON(result.data.snapshots[0].payload); // raw data, no protection
```

Per project convention, untrusted/user-submitted data should use `securedClone()` to prevent prototype pollution.

**Fix:**

```diff
+ import { securedClone } from '$lib/utils/securedClone';

- formState.fromJSON(result.data.snapshots[0].payload);
+ formState.fromJSON(securedClone(result.data.snapshots[0].payload));
```

---

### 7. Silent Failure in Edit Mode

**Authors:** Multiple

When snapshot loading fails (network error, 403, 404), the user is silently redirected to the case dashboard with no error message. `res.ok` is also not checked before calling `res.json()`.

**Fix:** Check `res.ok` and show an error before redirecting:

```typescript
if (!res.ok || !result.success) {
	// Show toast or error state
	goto(`/dashboard/dsa/cases/${editCaseId}?error=edit_failed`);
	return;
}
```

---

## MEDIUM — Track for Cleanup

### 8. `console.error` in Production Code

All 3 unsecured loan pages have `console.error` calls outside `if (dev)` guards. The `console.log` calls are correctly guarded, but `console.error` is not. Also, `handleStaleDetected` in `results/+page.svelte:167` is a stub that only logs — stale lender detection silently does nothing.

**Fix:** Wrap in `if (dev)` or use `import.meta.env.DEV`.

---

### 9. `mapLoanType()` Duplicated 3 Times

The same function is copy-pasted into professional, personal, and business loan pages. Extract to `$lib/utils/unsecuredApplicantHandlers.ts` so changes only need to happen once.

---

### 10. `obligationKeysName` Dead Export

`professional-loan/+page.svelte:76` and `business-loan/+page.svelte:81` export a `writable` store from `+page.svelte` files. SvelteKit doesn't support this — these exports are unreachable. Remove them or move to `$lib/stores/`.

---

### 11. Comment Says One Thing, Code Does Another

`src/lib/utils/unsecuredApplicantHandlers.ts:38-46` — Comment says "Employment type is NOT set here" but Professional and Business loans explicitly set `employmentType`. Update the comment.

---

## Quick Reference — Who Should Fix What

| Developer        | Items                                                         | Priority  |
| ---------------- | ------------------------------------------------------------- | --------- |
| **Admin/DevOps** | #1 (.env untrack + credential rotation)                       | Today     |
| **Mrityunjay**   | #2 (CSRF), #5 ({@html}), #8 (console), #9 (dedup mapLoanType) | This week |
| **Rishabh**      | #4 (professional_practice showWhen), #10 (dead export)        | This week |
| **Sudhanshu**    | #3 (mapLoanType source), #11 (comment fix)                    | This week |
| **All**          | #6 (securedClone), #7 (silent failure)                        | This week |
