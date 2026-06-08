# Daily Code Review — 2026-05-12

**Scope:** 5 commits `91a605a5..12e6ec0d` (2026-05-06 → 2026-05-12). All by primary author (Prashant). No teammate commits.

**Prior review:** [`CODE-REVIEW-2026-05-11.md`](CODE-REVIEW-2026-05-11.md) — no new commits at that time; last reviewed commit was `91a605a5`.

**Contrast audit:** [`CONTRAST-AUDIT-2026-05-12.md`](CONTRAST-AUDIT-2026-05-12.md) — 456/456 pairs pass.

---

## Commits Reviewed

| SHA | Subject | Files | +/- |
|-----|---------|-------|-----|
| `e347d67e` | fix(form): batch UX fixes across loan flows + sidebar IA cleanup | 34 | +849/−548 |
| `2bb26671` | chore(audit): numeric-limit + sanitization audit + weekly review docs | 26 | +1441/−12 |
| `fe972c80` | feat(forms): migrate description icons from emoji to Lucide + dark mode | 11 | +107/−92 |
| `6a3a4ab1` | fix(plot-loan): prevent contradictory plot-state vs construction-progress | 2 | +49/−15 |
| `12e6ec0d` | fix(form): re-resolve dynamic question/description text on same-page answer changes | 4 | +95/−3 |

Total: 71 files changed, +2541/−670.

---

## Standing Grep Rules — Full Tier 1-4 Sweep

| Rule | Tier | Result | Delta vs May 11 |
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
| **H1** — `state_referenced_locally` warning | T3 | **0 errors, 0 warnings** — `pnpm check` passes clean | Unchanged |
| **K** — JSON-Logic `!=` in `src/lib/config/` | T3 | 346 occurrences across 43 files. All against string literals — no null-check patterns. | −7 (showWhen simplification in constructionDetails_Plot.ts) |
| **L** — Numeric fields without explicit `minLimit` | T3 | **107 test files pass, 10,432 tests green** (`numericFieldsHaveExplicitLimits` included). | Unchanged |
| **M** — `combinedAnswers` alias collision | T3 | **0 matches** after known-safe filter. | Unchanged |
| **S** — Color token contrast audit (WCAG AA) | T3 | **456/456 pairs pass** across all 12 themes. | Unchanged |
| **O** — Payload snapshot drift | T4 | **Triggered** (questionBank changes). All 10,432 tests pass including schemaFixtureFactory. Clean. | Triggered — clean |
| **P** — Auto-clear parity (6 form pages) | T4 | **Triggered** (form page changes). **6 files matched** — correct parity. | Triggered — clean |
| **Q** — `engines.node` pin | T4 | **Triggered** (package.json changed). `"22.x"` — correctly pinned. | Triggered — clean |
| **R** — Server→client field forwarding | T4 | **Triggered** (new `*Dynamic` fields on `ClientQuestion`). All 4 fields forwarded via `toClientQuestion()` in `engine.ts`. Properly plumbed. | Triggered — clean |

---

## Critical Findings

None.

---

## High-Priority Findings

None.

---

## Medium Findings

### M1 — `createIcons({ icons })` imports the entire Lucide icon library into the client bundle

**File:** [`InfoModal.svelte:7`](src/lib/components/InfoModal.svelte:7)
**Commit:** `fe972c80`
**Confidence:** 85%

```ts
import { createIcons, icons } from 'lucide';
```

The `icons` object from the `lucide` package contains all ~1,500 icon definitions. Tree-shaking does not help because `icons` is a single namespace object passed wholesale to `createIcons()`. The description HTML only references a handful of icons (`map-pin`, `home`, `handshake`, `hard-hat`, `lightbulb`, `scale`, `file-text`, etc.), so the bundle carries ~1,400 unused icon definitions.

**Impact:** Bundle size increase on every page that loads `InfoModal` (all form pages). Exact size depends on Vite's dead-code elimination, but the vanilla `lucide` package is ~200KB unminified.

**Recommended fix:** Import only the specific icons used in description HTML:
```ts
import { createIcons, MapPin, Home, Handshake, HardHat, Lightbulb, Scale, FileText, /* ... */ } from 'lucide';
// ...
createIcons({ icons: { MapPin, Home, Handshake, HardHat, Lightbulb, Scale, FileText } });
```

This requires surveying all `data-lucide="..."` values in description strings across questionBank files and maintaining the import list, but cuts the bundle by ~95%.

### M2 — Plot-loan ATS readonly condition hardcodes answer string values

**File:** [`plot-loan/+page.svelte:1497`](src/routes/(app)/form/plot-loan/+page.svelte:1497)
**Commit:** `e347d67e`
**Confidence:** 75%

```ts
readonly={(question.uiMeta as any)?.readonly === true &&
    (currentAnswers as any).ATSReady === 'No' &&
    (currentAnswers as any).ATSvalue === 'Suggestion Required'}
```

This bypasses the schema-driven `uiMeta.readonly` flag with hardcoded string comparisons against answer values. If the ATS question options change (e.g., "No" renamed, "Suggestion Required" relabeled), this condition silently breaks and the field stays readonly when it shouldn't (or vice versa). The pattern is also only in the plot-loan page — if ATS fields exist on other loan types, parity would be missed.

**Recommended:** Express this as a `readonlyWhen` JSON-Logic condition in the schema, or at minimum extract the string literals into named constants.

### M3 — `_maxPossibleEmis` computed from `new Date()` — test sensitivity

**File:** [`combinedAnswersMemo.ts:193`](src/lib/utils/combinedAnswersMemo.ts:193)
**Commit:** `e347d67e`
**Confidence:** 65%

`computeMonthsSinceDisbursement()` uses `new Date()` to compute elapsed months. This makes `buildCombinedAnswersBase` non-deterministic — the same inputs produce different `_maxPossibleEmis` values depending on when the code runs. The `_` prefix and its use as a validation helper (not persisted) limit the blast radius, but if this field ever appears in a snapshot test or payload assertion, it will flake across month boundaries.

**Impact:** Low — currently used only in cross-field validation for BT EMI counts. No snapshot tests capture it.

### M4 — Prior carry-forward: guards.test.ts flaky timeout (6th consecutive review)

**File:** [`guards.test.ts:269`](src/lib/testing/__tests__/guards.test.ts:269)
**Confidence:** 75%

Test suite passed cleanly this run (10,432/10,432), but the flaky timeout has appeared in 4 of the past 6 review runs. Dynamic `import('$lib/server/guards')` likely contends with MongoDB setup in parallel test files.

**Impact:** Low — CI false-red risk. Not a code bug.

**Recommendation:** Add `{ timeout: 10000 }` to the specific test. Longest-standing open finding (6th consecutive review).

---

## Resolved Carry-Forwards

| ID | From | Finding | Status |
|----|------|---------|--------|
| M1 (May 11) | Working tree | 19-file uncommitted change set (5 days) | **Resolved** — committed as `2bb26671` + `e347d67e` |
| M2 (May 6) | `form.svelte.ts` | `_jsonEquals` JSON.stringify ordering | **Resolved** — `_stableStringify` in commit `2bb26671` |
| M3 (May 6) | `applicantFormManager.svelte.ts` | `_companyTypeChangeConfirmed` try/finally | **Resolved** — try/finally added in commit `2bb26671` |
| M1 (May 6) | `IncomeSourceForm.svelte` | `AUTO_LOCKED_KEYS` locked-empty state | **Resolved** — `isAutoLocked()`/`isAutoFillPending()` split in commit `e347d67e` |

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

### O1 — Well-architected dynamic text re-resolution (commit `12e6ec0d`)

The `*Dynamic` field pattern for client-side re-resolution of switch-array text is clean:
- Server still provides resolved strings for SSR/first-paint (backwards-compatible)
- Client re-evaluates only when `*Dynamic` source is present (no-op for static text)
- All 6 form pages benefit automatically via `deriveVisibleQuestions` — no per-page edits needed
- Types are properly extended with JSDoc explaining the relationship to `b8e2ab6c`

### O2 — Plot-loan contradiction fix is elegant (commit `6a3a4ab1`)

Using `flagKey` to derive `constructionProgress` from `plotCurrentState` eliminates the contradictory-answer class of bugs at the schema level, with the page handler mirroring the existing home-loan pattern.

### O3 — 4 long-standing carry-forwards resolved

The previously-uncommitted 19-file change set (flagged across 3 consecutive reviews) has been committed. The `_stableStringify`, try/finally, and `isAutoLocked`/`isAutoFillPending` fixes are all clean.

### O4 — Codebase health metrics

- **Test suite:** 10,432 tests across 107 files. All pass.
- **Type-check:** 0 errors, 0 warnings.
- **Contrast audit:** 456/456 pairs pass WCAG AA across all 12 themes.
- **Security surface:** No new violations across all Tier 1 rules.
- **JSON-Logic `!=` count:** 346 (down from 353 — 7 removed in showWhen simplification).

### O5 — QA scenarios endpoint dev-mode guard relaxation

[`api/qa/scenarios/+server.ts:72`](src/routes/api/qa/scenarios/+server.ts:72) now skips `requireAdminPermission` when `dev === true`. This is explicitly intentional (commit `e347d67e` — "Save Scenario is a DEV-only utility"), the UI gate is `{#if dev}`, and `dev` is Vite's build-time constant that is always `false` in production. Acceptable design choice — noting for audit trail.

---

## Top 3 Actions for Next Session

1. **Fix Lucide full-icon import (M1)** — Replace `import { icons } from 'lucide'` with selective named imports in [`InfoModal.svelte`](src/lib/components/InfoModal.svelte). Survey `data-lucide="..."` values across questionBank description strings to build the import list. Potential ~150KB+ bundle savings.

2. **Schema-ify the ATS readonly condition (M2)** — Extract the hardcoded `ATSReady === 'No'` / `ATSvalue === 'Suggestion Required'` check in [`plot-loan/+page.svelte:1497`](src/routes/(app)/form/plot-loan/+page.svelte:1497) into a `readonlyWhen` JSON-Logic condition in the schema, or at minimum into named constants.

3. **Fix guards.test.ts flaky timeout (M4)** — 6th consecutive review flagging this. Add `{ timeout: 10000 }` to the specific test at [`guards.test.ts:269`](src/lib/testing/__tests__/guards.test.ts:269). Longest-standing open finding.
