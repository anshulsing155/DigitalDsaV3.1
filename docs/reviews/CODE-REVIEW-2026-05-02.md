# Daily Code Review — 2026-05-02

**Scope:** 11 commits since the last review (`9423b626`, April 28 evening). 2 commits (`8260341b`, `baa83a93`) were landed after the April 28 evening review was written but before its commit — they were not covered and are included here. 1 teammate commit (`e1f3bf8c` by Sudhanshu Kansal) receives extra scrutiny.

**Standing grep rules (Rules A–D + Pitfall #9):** All 5 executed. Rules B, D clean (0 matches). Rule A: same known-safe inventory as April 28 — no new violations. Rule C: same 10 acceptable instances. Pitfall #9 (`typeof window !== 'undefined'`): 0 matches — still eradicated.

---

## Commits Reviewed

| Commit | Author | Subject | Verdict |
|--------|--------|---------|---------|
| `8260341b` | Prashant | fix: adjust Batch A+B based on user feedback | **Clean** |
| `baa83a93` | Prashant | fix(form): surface currency minLimit/maxLimit errors + disable Next on input errors | **Clean — good targeted re-enable** |
| `f00463d4` | Prashant | fix(admin): remove dangling 'Coverage Map' tab on QA page | **Clean** |
| `73798eaf` | Prashant | fix(admin): return 404 (not 400) for unparseable ObjectId in 3 page loads | **Clean** |
| `d9d73b9b` | Prashant | fix(qa): unbury Coverage Map page + gitignore root-scope fix | **Clean — new page, well-guarded** |
| `5fa30425` | Prashant | fix(gitignore): scope all over-broad bare-name patterns to root only | **Clean — excellent root-cause fix** |
| `570855b1` | Prashant | docs(specs): add audit-cleanup phased plan + status tracker | **Docs only** |
| `bf57fc6b` | Prashant | fix(home-loan): force propertyIdentified='Yes' for BT/Top-up | **Clean** |
| `e6fa54e3` | Prashant | docs: changelog + plan entry for bf57fc6b | **Docs only** |
| `aeaf09f8` | GitHub merge | fix(husky): pre-push false-positive on first push of new branch (#2) | **Clean** |
| `e1f3bf8c` | **Sudhanshu Kansal** (teammate) | fix the location modal | **2 High, 1 Medium — see below** |

---

## Teammate Commit: `e1f3bf8c` — Sudhanshu Kansal

This commit touches 2 files: [`LocationGroup.svelte`](src/lib/components/LocationGroup.svelte) (UI modal fix) and [`loanRequirement.ts`](src/lib/config/businessLoan/questionBank/loanRequirement.ts) (business logic change). The UI fix is reasonable in intent (scroll lock + scrollable area list + z-index bump) but has implementation issues.

### H1 — Missing `$effect` cleanup for scroll lock (confidence: 95%)

**File:** [`LocationGroup.svelte:314-324`](src/lib/components/LocationGroup.svelte:314)

The `$effect` sets `document.body.style.overflow = 'hidden'` when a modal opens but has **no cleanup/teardown function**. If the `LocationGroup` component unmounts while either modal is open (e.g., SvelteKit navigates away, user clicks browser back, parent `{#if}` hides the form section), the scroll lock persists globally. The user cannot scroll on the destination page.

```svelte
// CURRENT — no cleanup
$effect(() => {
    const isAnyModalOpen = areaPickerOpen || modalOpen;
    if (isAnyModalOpen) {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    } else {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    }
});

// FIX — add return cleanup
$effect(() => {
    const isAnyModalOpen = areaPickerOpen || modalOpen;
    if (isAnyModalOpen) {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    } else {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    }
    return () => {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    };
});
```

**Impact:** Body scroll permanently locked after navigation away from a form page while area-picker or location modal is open. Requires page refresh to recover.

### H2 — Undocumented business-logic change buried in UI fix (confidence: 90%)

**File:** [`loanRequirement.ts:176`](src/lib/config/businessLoan/questionBank/loanRequirement.ts:176)

Changed `q2_loanAmount` from `required: false` to `required: true` for business loans. This is a **significant business-logic change** — the loan amount question now blocks form progression if unanswered.

Concerns:
- **Commit message mismatch**: "fix the location modal" says nothing about changing loan amount validation
- **No corresponding change in other 5 loan types**: If loan amount should be required for business loans, shouldn't it also be required for personal, professional, home, LAP, and plot?
- **Draft case breakage risk**: Existing in-progress business loan cases saved without a loan amount will now show as incomplete / blocked on this page
- **No test update**: The change isn't reflected in any test fixture

**Action needed:** Confirm with Sudhanshu whether this was intentional. If yes, make the same change across all 6 loan types (or document why business loans are different). If accidental, revert.

### M1 — z-[9999] z-index escalation (confidence: 85%)

**File:** [`LocationGroup.svelte:655`](src/lib/components/LocationGroup.svelte:655)

The area-picker modal z-index was bumped from `z-50` (standard modal tier) to `z-[9999]`. This is a brute-force fix that bypasses the project's z-index hierarchy.

- Other modals in the project use `z-50` (standard) or `z-[60]` (above-modal overlays)
- `z-[9999]` will sit above everything including error boundaries, notification toasts, and any future modals
- Pattern leads to escalation wars when the next overlap bug appears

**Suggested fix:** Identify what was overlapping the modal (likely a parent with `z-40` or `z-50` and `overflow: visible`), fix the stacking context at the source. If a quick fix is needed, `z-[60]` or `z-[70]` is sufficient.

---

## Prashant Commits — Detailed Notes

### `8260341b` — Batch A+B adjustments

- [`TextField.svelte`](src/lib/components/TextField.svelte): Disabled `inputErrorsState` display — correct interim measure while gibberish-detection rules remain too strict for Indian names
- [`ErrorBoundary.svelte`](src/lib/components/landing/ErrorBoundary.svelte): Dev-mode bypass (`if (dev) return`) skips fallback UI + alert emails in development. Smart — lets devs see raw crashes in DevTools. Both `handleError` (L109) and unhandled-rejection (L135) paths covered.
- [`crm/+page.server.ts`](src/routes/dashboard/dsa/crm/+page.server.ts): Enhanced TODO comment documenting planned archive system. No code change.

**Verdict:** Clean. All three changes are well-reasoned.

### `baa83a93` — Currency minLimit/maxLimit errors + Next-button gate

- [`TextField.svelte`](src/lib/components/TextField.svelte): Re-enables error display but **only for `uiType === 'number'`** fields. Good targeted approach — numeric/currency validation (min/max amount ranges) has no false positives, unlike the text-field gibberish detector. Guard `!error` prevents double-display with the existing error prop.
- All 6 form pages: Adds `&& !hasInputErrors()` to the Next button's `disabled` expression. Ensures that if a currency field has a range error (e.g., "Loan amount must be at least 10L"), the Next button stays disabled even in `useValidateOnClick` mode.
- [`stakeholderManagement.test.ts`](src/lib/testing/__tests__/stakeholderManagement.test.ts): Adds `designation: 'director'` to Pvt Ltd test fixtures. Makes tests match actual runtime behavior (Pvt Ltd defaults to 'director' designation).

**Verdict:** Clean. Good pattern — gating error display to the validated subset only.

### `d9d73b9b` — Coverage Map page + gitignore root-scope fix

New page at [`/dashboard/admin/qa/coverage`](src/routes/dashboard/admin/qa/coverage/+page.svelte):
- **Server** ([`+page.server.ts`](src/routes/dashboard/admin/qa/coverage/+page.server.ts)): Proper `requireRole(locals, 'admin')` + `requireAdminPermissionPage(locals, 'qa_view')` guards. MongoDB aggregation groups scenarios by loan type x employment. No injection risk — pipeline uses static `$match`/`$group` stages with no user input.
- **Client** ([`+page.svelte`](src/routes/dashboard/admin/qa/coverage/+page.svelte)): Svelte 5 patterns (`$props()`, `$derived`). Link hrefs use `encodeURIComponent()` for query params — XSS-safe. Uses `ROUTES` constants for internal navigation. No `fetch` calls (data comes from `load()`).
- **gitignore** fix: `/coverage/` with leading slash restricts to repo root only. Good root-cause fix for the 6-day silent suppression.

Also reverts the tab removal from `f00463d4` — the Coverage Map tab is back now that the actual route exists.

**Verdict:** Clean. Well-structured admin page with proper guards.

### `5fa30425` — Gitignore comprehensive scoping

Systematic audit of all bare-name patterns in `.gitignore`:
- `test-results` → `/test-results/`, `playwright-output` → `/playwright-output/`, `.playwright-mcp` → `/.playwright-mcp/`
- `BACKUP_*`, `*_PLAN.md`, `*_SUMMARY.md`, `*_CHECKLIST.md`, `temp/` → all root-scoped with `/`
- All stale milestone docs (`CHECKLIST.md`, `DASHBOARD_COMPLETE.md`, etc.) → root-scoped
- `ios` → `/ios/`
- Added comprehensive "GITIGNORE DEPTH NOTES" footer explaining the convention

**Verdict:** Excellent. This prevents future silent file suppression bugs. The notes at the bottom serve as a guard rail for future edits.

### `bf57fc6b` — BT propertyIdentified fix

[`home-loan/+page.svelte`](src/routes/(app)/form/home-loan/+page.svelte): New `$effect` forces `propertyIdentified='Yes'` when `loanType` is anything other than 'New Loan'. Handles the pivot scenario: user selects New Loan → answers 'No' to propertyIdentified → pivots to BT/Top-up → stale 'No' would break downstream `showWhen` conditions.

- Guard condition (`if (!loanType || loanType === 'New Loan') return`) is correct — New Loan is the only type where `propertyIdentified` can be 'No'
- `updateAnswerByKey` with equality check prevents infinite `$effect` re-triggers
- Well-commented with the business rationale

**Verdict:** Clean. Correct fix for the stale-answer pivot bug.

### `aeaf09f8` — Husky pre-push fix

[`.husky/pre-push`](.husky/pre-push): Adds `--verify --quiet` flags to `git rev-parse` when checking `origin/$current_branch`. Without these flags, `rev-parse` echoes the literal ref name on failure (instead of returning non-zero), which made the new-branch check think the remote existed — false-positive "branch has diverged" block on first push.

**Verdict:** Clean. Good fix with clear comments.

---

## Standing Grep Rules — Comparison with April 28 Evening

### Rule A — CSRF: raw `fetch()` on mutating endpoints

**Status: No new violations.** Same inventory as documented in the [April 26 sweep](docs/reviews/2026-04-26-sweep.md).

| Category | Files | Status |
|----------|-------|--------|
| Pre-auth flows (login, signup, OTP) | `login/+page.svelte`, `partner-signup/+page.svelte` | Known-safe — no session to protect |
| GET-only calls (locations, pincodes, staleness) | 6 form pages, `ApplicantProfilePage`, `ProfileTabContent`, etc. | Safe |
| Token-auth flows (share links) | `f/[token]/+page.svelte` | Known-safe — token is the auth |
| Onboarding email POSTs | `BasicFields.svelte:70,88`, `AboutYou.svelte:78,92` | **Known unfixed** — these POST to `/api/auth/check-email` and `/api/auth/send-email-verification` from within authenticated onboarding. Should use `secureFetch`. Flagged in prior reviews; low-risk (onboarding is one-time, attacker gains nothing). |
| Client service files | `verifyEmailOTP.ts`, `sessionService.ts`, `authService.ts` | Auth infrastructure — session management uses its own auth token patterns |

### Rule B — Static Capacitor imports at module scope
**Status: Clean (0 matches).**

### Rule C — `window.location.reload()` inventory
**Status: Same 10 acceptable instances.**
1. `hooks.client.ts:46` — stale-chunk recovery
2. `+error.svelte:203` — error page retry
3. `admin/testing/+page.svelte:33,56` — admin seed pages
4. `LanguageSelector.svelte:57` — i18n module reload
5. `ErrorBoundary.svelte:159` — error recovery
6. `ResetDataButton.svelte:48` — DSA form nuke
7. `admin/policies/[artifact_id]/test/+page.svelte:156` — admin test
8. `admin/policies/+page.svelte:98` — admin policies
9. `admin/+page.svelte:197` — admin dashboard

### Rule D — Capacitor proxy thenable trap
**Status: Clean (0 matches).**

### Pitfall #9 — `typeof window !== 'undefined'`
**Status: Clean (0 matches). Fully eradicated.**

---

## Prior Findings Tracker

| # | Finding | Origin | Status |
|---|---------|--------|--------|
| L-NEW-1 | CI `scanFormBindsTos()` hardcodes JSON file list | Apr 28 morning | Still open |
| M-NEW-1 | `coerceValueField()` silently nullifies complex values | Apr 28 evening | Still open |
| Onboarding raw `fetch` POSTs | `BasicFields.svelte`, `AboutYou.svelte` | Apr 26 sweep | Known unfixed (low risk) |

---

## Top 3 Actions for Next Session

1. **Fix H1 — Add `$effect` cleanup in `LocationGroup.svelte:314`** to prevent permanent scroll lock on unmount. One-line return clause.

2. **Clarify H2 — Confirm `loanAmount: required: true` was intentional** for business loans (`e1f3bf8c`). If yes, apply consistently across all 6 loan types. If no, revert.

3. **Fix M1 — Replace `z-[9999]` with a reasonable z-index** (`z-[60]` or `z-[70]`) in the area-picker modal. Diagnose the actual stacking-context overlap that prompted the change.
