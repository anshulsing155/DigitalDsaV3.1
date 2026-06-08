# Daily Code Review — 2026-05-13

**Scope:** 7 commits `381d8762..ef2b31d5` (all 2026-05-12, after yesterday's review cutoff). All by primary author (Prashant). No teammate commits.

**Prior review:** [`CODE-REVIEW-2026-05-12.md`](CODE-REVIEW-2026-05-12.md) — reviewed through `12e6ec0d`.

**Contrast audit:** [`CONTRAST-AUDIT-2026-05-12.md`](CONTRAST-AUDIT-2026-05-12.md) — 456/456 pairs pass (unchanged; no new color tokens in this batch).

---

## Commits Reviewed

| SHA | Subject | Files | +/- |
|-----|---------|-------|-----|
| `381d8762` | fix(form): seed applicant sub-step on schema-page entry — stop skipping Who's Applying | 7 | +108/−4 |
| `96d6445f` | fix(form): recompute ATS suggestion on toggle back to Suggestion Required | 3 | +40/−8 |
| `115142b2` | fix(applicants): correct active-loan lookup so Residence pincode field appears | 1 | +22/−5 |
| `1af3df17` | fix(applicants): hide residence state/city/pincode for NRI applicants | 2 | +12/−4 |
| `52ec7414` | feat(personal-loan): reframe case-level location as "processing branch", let applicants mark residence relative to it | 5 | +196/−60 |
| `c58cf6ea` | chore(icons): lucide migration batch — counterparty descriptions, theme-aware date modal, registry additions | 5 | +33/−21 |
| `ef2b31d5` | fix(income): sync director-company designation on applicant-role change + hide MD when role isn't MD | 2 | +42/−8 |

Total: 20 files changed, +481/−100.

---

## Standing Grep Rules — Full Tier 1-4 Sweep

| Rule | Tier | Result | Delta vs May 12 |
|------|------|--------|-----------------|
| **A** — CSRF: raw `fetch()` + POST in `.svelte`/`.ts` | T1 | Same known-safe inventory (see below). No new violations. | Unchanged |
| **E** — Unsanitized `{@html}` XSS vectors | T1 | **0 new violations.** Same 8 exception sites. All other instances use `sanitizeHtml()`. | Unchanged |
| **F** — Bare `console.log/error/warn` in server code | T1 | **0 violations.** `logger.ts` has 2 intentional `console.error`/`console.warn` (logger fallback). `api/auth/` has 2 commented-out lines. | Unchanged |
| **G** — `Co-Authored-By` in commits | T1 | **0 matches.** Clean. | Unchanged |
| **B** — SSR: static `@capacitor/*` imports | T2 | **0 matches** — clean | Unchanged |
| **C** — `window.location.reload()` | T2 | Same 10 instances — all approved exceptions | Unchanged |
| **D** — Async returning Capacitor proxy | T2 | **0 matches** — clean | Unchanged |
| **I** — `typeof window !== 'undefined'` (Pitfall #9) | T2 | **0 matches** — eradicated | Unchanged |
| **J** — Module-scope `fetch` (Pitfall #4) | T2 | **0 matches** — clean | Unchanged |
| **H1** — `state_referenced_locally` warning | T3 | **0 warnings** — `pnpm check` passes clean | Unchanged |
| **K** — JSON-Logic `!=` in `src/lib/config/` | T3 | 346 occurrences across 43 files. All against string literals — no null-check patterns. | Unchanged |
| **L** — Numeric fields without explicit `minLimit` | T3 | **107 test files pass, 10,432 tests green** (`numericFieldsHaveExplicitLimits` included). | Unchanged |
| **M** — `combinedAnswers` alias collision | T3 | **0 matches** after known-safe filter. | Unchanged |
| **S** — Color token contrast audit (WCAG AA) | T3 | **456/456 pairs pass** across all 12 themes. | Unchanged |
| **O** — Payload snapshot drift | T4 | Not triggered (no payloadBuilder or questionBank field-structure changes). | — |
| **P** — Auto-clear parity (6 form pages) | T4 | **Triggered** (form page changes — `syncApplicantStepOnEntry` added). **6 files matched** — correct parity. | Triggered — clean |
| **Q** — `engines.node` pin | T4 | Not triggered (package.json unchanged). | — |
| **R** — Server→client field forwarding | T4 | Not triggered (no new `RawSchemaQuestion`/`RawSchemaOption` fields). | — |

---

## Critical Findings

None.

---

## High-Priority Findings

None.

---

## Medium Findings

### M1 — `syncApplicantStepOnEntry` duplicated across 6 form pages (code duplication)

**Files:** All 6 form `+page.svelte` files
**Commit:** `381d8762`
**Confidence:** 70%

The `syncApplicantStepOnEntry()` function is copy-pasted identically into all 6 form pages (personal-loan has the full JSDoc, the other 5 have "See personal-loan/+page.svelte for full rationale"). The function body is 7 lines and calls `wizard.getApplicantPageId()`, `wizard.getApplicantStepBounds()`, and `formState.setApplicantPageIndex()` — all of which already exist in shared state modules.

**Impact:** Low — all 6 copies are identical and correct today. Risk: if one page needs a tweak, the other 5 must be manually updated (exactly the parity pattern flagged in CLAUDE.md Pitfall #12).

**Recommendation:** Extract to a shared utility (e.g., in `wizardState.svelte.ts` or `formWizardEngine.ts`) and import in each page. The function has no page-specific dependencies.

### M2 — NRI check uses `(applicant as any).isNRI` — unsafe cast

**File:** [`ApplicantProfilePage.svelte:955`](src/lib/components/ApplicantProfilePage.svelte:955)
**Commit:** `1af3df17`
**Confidence:** 65%

The NRI guard in the residence-fields block uses `(applicant as any).isNRI !== 'Yes'`. While this works, `as any` bypasses TypeScript's type checking. If the `isNRI` field is ever renamed or its value semantics change, the compiler won't catch it. The same pattern appears in the personal-loan `$effect` at line 565 (`a.isNRI === 'Yes'`) where the variable is already typed as `any`. `ProfileTabContent.svelte` uses the properly derived `isNRI` boolean — the cleaner pattern.

**Impact:** Low — the field name is stable and the cast is a convenience. But `ProfileTabContent` already demonstrates the right pattern (`let isNRI = $derived(...)`).

### M3 — `ShieldQuestionMark` trailing whitespace in import/export

**File:** [`iconRegistry.ts:90,315,516`](src/lib/utils/iconRegistry.ts:90)
**Commit:** `c58cf6ea`
**Confidence:** 90%

```ts
ShieldQuestionMark ,  // trailing whitespace before comma
```

Three instances in `iconRegistry.ts` have trailing whitespace between `ShieldQuestionMark` and the comma. While syntactically valid JavaScript, it's a lint-level style issue. All 3 export/registry lines have the same trailing space.

**Impact:** None functional — purely cosmetic. But it stands out as the only identifier in the 500+ line registry with this inconsistency.

---

## Resolved Carry-Forwards from Prior Reviews

| ID | From | Finding | Status |
|----|------|---------|--------|
| M1 (May 12) | `InfoModal.svelte` | Full `icons` Lucide import (~200KB) | **In progress** — working-tree change replaces with selective 36-icon import. Uncommitted. |
| M2 (May 12) | `plot-loan/+page.svelte` | Hardcoded ATS readonly string values | **In progress** — working-tree change extracts `ATS_READY_NO` / `ATS_MODE_SUGGESTION` constants. Uncommitted. |
| M3 (May 12) | `combinedAnswersMemo.ts` | `computeMonthsSinceDisbursement` non-deterministic | **In progress** — working-tree change adds optional `referenceDate` parameter. Uncommitted. |
| M4 (May 12) | `guards.test.ts` | Flaky timeout (6th consecutive review) | **In progress** — working-tree change adds `{ timeout: 10000 }` to the test. Uncommitted. |

All 4 of yesterday's top-3 action items are being addressed in the current working tree. They will be fully resolved once committed.

---

## Commit-Level Analysis

### `381d8762` — seed applicant sub-step on schema-page entry

**Quality: Good.** Adds `getApplicantPageId()` and `getApplicantStepBounds()` to `wizardState.svelte.ts` — clean read-only utilities with proper null handling. All 6 form pages updated with full parity (Rule P verified). The `syncApplicantStepOnEntry` function correctly no-ops when already on the applicant page (preventing sub-step interference) and when the target page isn't the applicant page at all.

**One concern:** the function is duplicated 6 times (see M1 above).

### `96d6445f` — recompute ATS suggestion on toggle back to Suggestion Required

**Quality: Good.** The `lastATSMode` tracking variable is well-designed — it distinguishes "same inputs, same mode" (skip) from "same inputs, mode just toggled back" (recompute). Applied to both home-loan and plot-loan `$effect` blocks with consistent logic. The `modeChanged` flag is checked alongside the `calcKey` guard, not as a standalone trigger, preventing unnecessary recomputation.

No `$state` self-tracking issue (Rule H2) — `lastATSMode` and `lastATSCalc` are plain `let` variables, not `$state`, so the `$effect` doesn't self-trigger.

### `115142b2` — correct active-loan lookup so Residence pincode field appears

**Quality: Good.** The `getActiveLoanAnswers()` fix in `ProfileTabContent.svelte` is well-commented. The lookup order (loanData.loanName → applicationData.loanName → key scan) is a correct prioritization. The `||` vs `??` choice is explicitly documented — empty strings fall through. This fixes a real bug where stale loanData keys from prior loan switches caused silent SAME_CITY auto-fill failures.

### `1af3df17` — hide residence state/city/pincode for NRI applicants

**Quality: Good.** Correctly gates the India-specific pincode/state/city section behind `isNRI !== 'Yes'` in both `ApplicantProfilePage` (single-applicant) and `ProfileTabContent` (multi-applicant). Parity is maintained. The `(applicant as any)` cast in `ApplicantProfilePage` is the only style concern (see M2 above).

### `52ec7414` — personal-loan "processing branch" reframe

**Quality: Very Good.** This is the largest commit (196 lines) and the most architecturally significant. The change:
1. Reframes personal-loan's case-level location from "residence" to "processing branch" — semantically correct and eliminates the circular "residence relative to residence" question
2. Shows the per-applicant "Residence relative to X" question once the anchor is filled (graceful DC-flow handling)
3. Defaults to `SAME_CITY` only when `applicantResidencePattern` is unset — stops overwriting explicit user choices
4. Adds `caseAnchor` derivation and `getCaseAnchorLocation()` to `ProfileTabContent.svelte` for parity with `ApplicantProfilePage.svelte`
5. Updates sidebar/wizard guidance text to match the new framing

The `$effect` logic change in `ApplicantProfilePage` (lines 562-580) is the most safety-critical part: it now only defaults to `SAME_CITY` when the field is empty (not set), and only syncs state/city when the current pick IS `SAME_CITY`. This prevents the bug where toggling to "Different city" would get immediately overwritten back to "SAME_CITY" by the reactive effect. Well-reasoned.

### `c58cf6ea` — lucide migration batch

**Quality: Good.** Standard icon migration: emoji → Lucide `data-lucide` attributes in counterparty descriptions, `text-primaryText` → `text-[var(--dash-btn-text)]` in `MonthYearModal.svelte` for theme-awareness, 3 new icons added to `iconRegistry.ts`. The `dark:text-gray-400` classes on `.info-box.highlight` ensure dark-mode readability for the migrated descriptions.

Minor: trailing whitespace on `ShieldQuestionMark` (see M3).

### `ef2b31d5` — sync director-company designation on applicant-role change

**Quality: Good.** The 3-case reactive designation sync in `directorAutoIncome.ts` is well-structured:
1. `directorRole === 'managing_director'` → force `designation = 'md'`
2. `directorRole` is NOT MD but `designation === 'md'` (stale) → clear to `undefined`
3. `designation` is `undefined` → fill from mapping (original behaviour)

This correctly propagates applicant-level role changes to the income form. The `IncomeSourceForm.svelte` filter that removes the 'md' option from the designation dropdown when `parentDirectorRole !== 'managing_director'` is a good UI guard that prevents the user from accidentally selecting MD as a subtype.

**H2 check (Rule H2):** The `$derived` for `parentDirectorRole` reads from `formState.applicants[applicantIndex]`, which is `$state`-backed. This is a read-only derivation — no self-referential `$effect` issue.

---

## Rule A — Known-Safe Raw `fetch` Inventory (unchanged)

| Location | Method | Why safe |
|----------|--------|----------|
| `(auth)/login/+page.svelte` | POST (8x) | Pre-auth pages — no session, CSRF irrelevant |
| `(auth)/partner-signup/+page.svelte` | POST (5x) | Pre-auth — same reason |
| `f/[token]/+page.svelte` | POST (3x) | Public share-link — token-gated, no session |
| `onboarding/BasicFields.svelte` | POST (2x) | Pre-session onboarding |
| `onboarding/steps/AboutYou.svelte` | POST (2x) | Pre-session onboarding |
| All form pages (`snapshots?limit=1`) | GET | Read-only data fetch |
| `how-can-we-help/+page.svelte` | GET | Read-only |
| `ApplicantProfilePage`, `ProfileTabContent`, `PincodeTypeahead` | GET | Location lookups |
| `CheckForUpdatesButton`, `OverviewTab` | GET | Read-only |
| `_archived/testAPI` | External tunnel | Archived test page |
| `dashboard/rm/+page.svelte` | GET | Preferred DSAs list |
| `services/sessionService.ts` | POST (6x) | Auth service — session management, pre-auth or auth-layer internal |
| `services/verifyEmailOTP.ts` | POST (2x) | Onboarding email verification — pre-session |
| `services/homeLoanApi.ts` | POST (3x) | External API calls — no CSRF scope |
| `services/authService.ts` | POST (3x) | Auth service — login/register/verify — pre-session |
| `utils/csrf.ts` | POST (3x) | The `secureFetch` wrapper itself |
| `utils/api.ts` | N/A | Capacitor platform wrapper — native app only |
| `server/externalFetch.ts` | N/A | Server-side external fetch utility |

No changes from prior review.

---

## Rule E — Known `{@html}` Exception Inventory (unchanged)

| Location | Content | Why safe |
|----------|---------|----------|
| `JsonLd.svelte` | JSON-LD structured data | Escaped via `JSON.stringify` |
| `Toast.svelte` | Internal SVG icon constants | Hardcoded, no user input |
| 4x form `pageDescription` | `serverPage?.pageDescription` | Server-controlled schema strings |
| `policies/[artifact_id]/+page.svelte` | `a.human_readable` | Admin-role only, internal policy text |
| `how-can-we-help/+page.svelte` | `NoteWorthyMessage()` | Hardcoded HTML strings, no user input |
| `_archive/` components (3x) | Various | Archived, not mounted |

All non-exception instances use `sanitizeHtml()`.

---

## Observations (Informational)

### O1 — Personal-loan "processing branch" reframe is architecturally clean

The `52ec7414` commit is the most significant change in this batch. The reframe from "residence location" to "processing branch" makes the UX semantically correct (personal loan has no property to anchor on, and the "residence relative to residence" question was circular). The implementation correctly:
- Reuses existing `residenceStateName`/`residenceCityName` field names for backward compat
- Adds `caseAnchor` abstraction to `ProfileTabContent.svelte` to match `ApplicantProfilePage.svelte`
- Handles the DC (direct continuation) flow where the processing location is captured AFTER applicants
- Stops overwriting explicit user picks (the previous `$effect` forced everyone to SAME_CITY)

### O2 — Working tree addresses all 4 prior review action items

Uncommitted changes in `InfoModal.svelte`, `plot-loan/+page.svelte`, `combinedAnswersMemo.ts`, and `guards.test.ts` address every item from yesterday's "Top 3 Actions" section. The InfoModal fix is particularly thorough — 36 named Lucide imports replacing the full `icons` namespace.

### O3 — Codebase health metrics

- **Test suite:** 10,432 tests across 107 files. All pass.
- **Type-check:** 0 errors, 0 warnings.
- **Contrast audit:** 456/456 pairs pass WCAG AA across all 12 themes.
- **Security surface:** No new violations across all Tier 1 rules.
- **JSON-Logic `!=` count:** 346 (unchanged).

### O4 — 6-page parity maintained for `syncApplicantStepOnEntry`

Commit `381d8762` touches all 6 form pages to add the `syncApplicantStepOnEntry` function. Rule P confirms all 6 files contain the `clearStaleOptionValues` pattern. The new function is identical across all pages — parity is perfect.

---

## Top 3 Actions for Next Session

1. **Commit working-tree fixes** — 4 uncommitted changes resolve all prior review carry-forwards (InfoModal selective Lucide import, ATS readonly constants, `computeMonthsSinceDisbursement` referenceDate, guards.test.ts timeout). Commit and close these out.

2. **Extract `syncApplicantStepOnEntry` to shared utility (M1)** — The function is duplicated identically in 6 form pages. Move to `wizardState.svelte.ts` or `formWizardEngine.ts` and import. Prevents future parity drift.

3. **Clean up `ShieldQuestionMark` trailing whitespace (M3)** — 3 instances in [`iconRegistry.ts`](src/lib/utils/iconRegistry.ts). Trivial cosmetic fix, can be bundled with next commit.
