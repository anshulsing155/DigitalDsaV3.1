# Daily Code Review — 2026-05-06

**Scope:** 18 commits since the last review (`CODE-REVIEW-2026-05-04.md`). All by primary author (Prashant / `tech@eyantrik.com`). No teammate commits requiring extra scrutiny. Covers Session 97 work: Clear Form fix saga (5 commits including 1 revert), sole-prop restoration, NBFC warning false-positive, formState idempotency, director auto-fill feature, cross-applicant warning surfacing, WCAG AA contrast audit toolchain, and color token alignment across all 12 themes.

**Note:** This file was updated by the second automated run on the same day, adding 2 commits (`ef4f6ed6`, `91a605a5`) and the full Tier 1–4 standing rule sweep.

---

## Standing Grep Rules — Full Tier 1–4 Sweep

| Rule | Tier | Result | Delta vs May 4 |
|------|------|--------|-----------------|
| **A** — CSRF: raw `fetch()` + POST in `.svelte`/`.ts` | T1 | Same known-safe inventory. No new violations. | Unchanged |
| **E** — Unsanitized `{@html}` XSS vectors | T1 | **0 new violations.** 4 `pageDescription` (server schema), 1 `NoteWorthyMessage` (hardcoded HTML), 1 `Toast.svelte` (internal SVG), 1 `JsonLd.svelte` (JSON.stringify), 1 admin policy page — all documented exceptions. All other instances use `sanitizeHtml()`. | Unchanged |
| **F** — Bare `console.log/error/warn` in server code | T1 | **0 violations.** `logger.ts` has 2 intentional `console.error`/`console.warn` (the logger fallback itself). `api/auth/` has 2 commented-out `console.log` lines. | Unchanged |
| **G** — `Co-Authored-By` in commits | T1 | **0 matches.** (The grep picked up CLAUDE.md doc text mentioning the rule — not an actual commit message.) | Unchanged |
| **B** — SSR: static `@capacitor/*` imports | T2 | **0 matches** — clean | Unchanged |
| **C** — `window.location.reload()` | T2 | Same 10 instances — all approved exceptions (`+error.svelte`, `hooks.client.ts`, `LanguageSelector`, `ResetDataButton`, admin pages) | Unchanged |
| **D** — Async returning Capacitor proxy | T2 | **0 matches** — clean | Unchanged |
| **I** — `typeof window !== 'undefined'` (Pitfall #9) | T2 | **0 matches** — eradicated | Unchanged |
| **J** — Module-scope `fetch` (Pitfall #4) | T2 | **0 matches** — clean | Unchanged |
| **H1** — `state_referenced_locally` warning | T3 | **0 matches** — clean (`pnpm check` passes) | Unchanged |
| **K** — JSON-Logic `!=` in `src/lib/config/` | T3 | ~50 matches — all existing, stable set. All are `!=` comparisons against string literals (`""`, specific values), not null checks. Pattern is intentional (`!= ""` means "field has been answered"). No new `!= null` / `!= undefined` patterns. | Unchanged |
| **L** — Numeric fields without explicit `minLimit` | T3 | **All 10,432 tests pass.** `numericFieldsHaveExplicitLimits` test green. | Unchanged |
| **M** — `combinedAnswers` alias collision | T3 | **0 matches** in `src/lib/components/` (after known-safe filter). | Unchanged |
| **S** — Color token contrast audit (WCAG AA) | T3 | **456/456 pairs pass** across all 12 themes. Report: [`CONTRAST-AUDIT-2026-05-06.md`](docs/reviews/CONTRAST-AUDIT-2026-05-06.md). **NEW** — first run of this rule. | New baseline |
| **P** — Auto-clear parity (6 form pages) | T4 | **6 files matched** — correct parity. No changes to form pages in new commits. | Unchanged |
| **Q** — `engines.node` pin | T4 | `"22.x"` — correctly pinned. Triggered because `package.json` was modified. | Unchanged |
| **O** — Payload snapshot drift | T4 | Not triggered (no payloadBuilder changes). Full test suite green. | N/A |
| **R** — Server→client field forwarding | T4 | Not triggered (no schema type changes). | N/A |

---

## Commits Reviewed

| Commit | Date | Subject | Verdict |
|--------|------|---------|---------|
| `96cb7a6e` | May 4 | fix(business-loan): hide Business Profile page for sole proprietorship | **Clean** |
| `91dd9bdb` | May 4 | fix(form): numeric field clear now actually clears across all 6 form pages | **Clean — good parity fix + XSS patch** |
| `73163523` | May 4 | fix(applicant): restore director ownership % when company matches | **Clean — well-tested** |
| `7c871818` | May 5 | feat(income): auto-fill and lock director specifics from parent Company | **Clean — see M1** |
| `9df816a2` | May 5 | feat(income): orphan-on-mismatch + DSA confirmation modal | **Clean — well-architected** |
| `722c78fe` | May 5 | docs(handoff): S97 active handoff + DEVELOPMENT-PLAN header refresh | **Docs only** |
| `1670243c` | May 5 | fix(applicants): align count metadata, page-scope errors, NBFC warning | **Clean** |
| `48bdd1c3` | May 4 | fix(applicants): NRI-flip cleanup, Clear Form ordering, GPA gate | **Clean** |
| `58416903` | May 5 | fix(form): Clear Form navigation + Sole-Prop restore UI sync | **Clean** |
| `f5b6fdde` | May 5 | fix(form): Clear Form uses full-page navigation to escape current form | **Superseded** — reverted in next commit |
| `9ff4bf50` | May 5 | Revert "fix(form): Clear Form uses full-page navigation to escape…" | **Clean** — correct revert |
| `9af809ec` | May 5 | fix(form): Clear Form uses formState.reset() to reach loan-type picker | **Clean — proper fix** |
| `f62b2fe2` | May 5 | fix(formState): replaceLoanData/replaceApplicationData are now idempotent | **Clean — see M2** |
| `1448c3e3` | May 5 | fix(applicants): sole-prop restore replaces existing slot, not appends | **Clean** |
| `1d868254` | May 5 | fix(applicants): NBFC warning false-positive + Sole-Prop sidebar gate | **Clean** |
| `74e887c2` | May 5 | fix(applicants): surface cross-applicant warnings reactively | **Clean** |
| `ef4f6ed6` | May 6 | feat(contrast): WCAG AA token contrast audit + daily-review integration | **Clean — see review below** |
| `91a605a5` | May 6 | fix(theme): align color tokens to WCAG AA across all 12 themes | **Clean — CSS only** |

---

## Critical Findings

None. No security vulnerabilities or critical bugs detected.

---

## High-Priority Findings

None.

---

## Medium Findings

### M1 — `AUTO_LOCKED_KEYS` expansion may over-lock on data gaps

**File:** [`IncomeSourceForm.svelte:321–337`](src/lib/components/IncomeSourceForm.svelte:321)
**Confidence:** 70%
**Commit:** `7c871818`

The `AUTO_LOCKED_KEYS` set grew from 5 to 12 entries. Keys like `companyProfitable`, `cin`, `firmGstRegistered` are now always locked on auto-entries — but the backfill logic in `syncAutoIncomeEntries` only populates them when the Company applicant has the source data (ITR years, GST status, CIN). If the DSA hasn't filled the Company profile yet when the director income card renders, these fields will be **locked AND empty** — the DSA can't fill them, and the Company profile step may be far away in the wizard.

**Mitigating factor:** The lock only applies when `isAutoEntry = autoCreated && !orphaned`. If the entry was orphaned (company deleted or type changed), these fields become editable. And `createDirectorIncomeEntry` only writes keys when values are derivable (`if (profitable !== undefined)`), so absent data = key not present in specifics = the form field renders with no value, which the engine treats as unanswered.

**Potential issue:** The locked-empty field state depends on whether the form component uses `specifics[key] !== undefined` vs `key in AUTO_LOCKED_KEYS` for the disabled check. If the component renders the input as disabled regardless of whether specifics has a value, the DSA gets stuck.

**Recommendation:** Verify that `IncomeSourceForm.svelte`'s field disable logic is `isAutoEntry && key in AUTO_LOCKED_KEYS && specifics[key] !== undefined` — i.e., only lock when there's actually a derived value present.

---

### M2 — `_jsonEquals` uses JSON.stringify ordering assumption

**File:** [`form.svelte.ts:210`](src/lib/state/form.svelte.ts:210)
**Confidence:** 60%
**Commit:** `f62b2fe2`

The idempotency helper uses `JSON.stringify(a) === JSON.stringify(b)` for structural equality. This works correctly for the stated use case (loanData/applicationData are small POJOs written by the same code path, so key order is stable). However, if `replaceLoanData` ever receives objects from different serialization paths (e.g., parsed from Capacitor storage vs built inline), key order may differ and the equality check fails — causing a spurious dirty write.

**Why this is low-risk today:** Both call sites (`$effect` mirrors and Clear Form) produce objects from the same derivation chain, so key order is deterministic. The comment correctly scopes the use case. No action needed unless `replaceLoanData` starts accepting externally-sourced data.

---

### M3 — `_companyTypeChangeConfirmed` re-entrancy flag is not cleaned on modal cancel

**File:** [`applicantFormManager.svelte.ts:~1290`](src/lib/components/applicantFormManager.svelte.ts:1290)
**Confidence:** 55%
**Commit:** `9df816a2`

The `_companyTypeChangeConfirmed` flag is set before `updateFormField` re-call and cleared after. If the user clicks Cancel, `openConfirmModal` returned before the flag was set, and execution hits `if (!_companyTypeChangeConfirmed) return;` — this is correct behavior (modal is async-ish via callback). However, if an exception were thrown between the flag set and clear inside the confirm callback, the flag would stay `true` permanently, bypassing the guard for all future company-type changes in the same session.

**Why this is low-risk:** The two statements between set/clear (`updateFormField` and the clear itself) are unlikely to throw — `updateFormField` is well-tested. But wrapping in try/finally would make it bulletproof:

```ts
try {
  _companyTypeChangeConfirmed = true;
  updateFormField(index, key, value);
} finally {
  _companyTypeChangeConfirmed = false;
}
```

---

### M4 — Contrast audit scripts are `.mjs` outside `src/` — no type-checking

**File:** [`scripts/contrast/*.mjs`](scripts/contrast/)
**Confidence:** 50%
**Commit:** `ef4f6ed6`

The 7 new `.mjs` files total ~1,289 lines and implement CSS parsing, WCAG color math, and var() resolution. They're well-structured and well-documented. However, as standalone `.mjs` files, they get no TypeScript checking. The color parsing (`wcag.mjs`) and var-resolution (`resolveVars.mjs`) are correctness-critical — a bug in hex parsing or alpha compositing would silently produce wrong contrast ratios.

**Why this is acceptable today:** The scripts are dev/CI tooling, not production code. The audit result (456/456 pass) was validated against known token values. The `--strict` mode provides a CI gate. Risk is limited to false-pass (accepting a failing pair as passing) rather than runtime failure.

**Recommendation for hardening (non-blocking):** Consider adding a small test file (`scripts/contrast/__tests__/wcag.test.mjs`) with known hex-pair → ratio assertions (e.g., black-on-white = 21:1, the WCAG example pairs). This prevents regressions in the math layer.

---

## Rule A — Known-Safe Raw `fetch` Inventory (unchanged from prior review)

| Location | Method | Why safe |
|----------|--------|----------|
| `(auth)/login/+page.svelte` | POST (8×) | Pre-auth pages — no session exists yet, CSRF irrelevant |
| `(auth)/partner-signup/+page.svelte` | POST (5×) | Pre-auth — same reason |
| `f/[token]/+page.svelte` | POST (3×) | Public share-link page — token-gated, no session |
| `onboarding/BasicFields.svelte` | POST (2×) | Email check/send during onboarding — pre-session |
| `onboarding/steps/AboutYou.svelte` | POST (2×) | Same — pre-session onboarding |
| All form pages (`snapshots?limit=1`) | GET | Read-only data fetch |
| `how-can-we-help/+page.svelte` | GET | Read-only |
| `ApplicantProfilePage`, `ProfileTabContent`, `PincodeTypeahead` | GET | Location lookups |
| `CheckForUpdatesButton`, `OverviewTab` | GET | Read-only |
| `_archived/testAPI` | External tunnel | Archived test page |
| `dashboard/rm/+page.svelte` | GET | Preferred DSAs list |
| `services/sessionService.ts` | POST (6×) | Auth service — manages session tokens, pre-auth or auth-layer internal |
| `services/verifyEmailOTP.ts` | POST (2×) | Onboarding email verification — pre-session |
| `services/homeLoanApi.ts` | POST (3×) | External API calls to bank-loan-management — no CSRF scope |
| `services/authService.ts` | POST (3×) | Auth service — login/register/verify — pre-session |
| `utils/csrf.ts` | POST (3×) | The `secureFetch` wrapper itself — internal implementation |
| `utils/api.ts` | N/A | Capacitor platform wrapper — native app only |
| `server/externalFetch.ts` | N/A | Server-side external fetch utility |

No new POST/PUT/PATCH/DELETE `fetch` calls added since last review. All mutating requests in authenticated components use `secureFetch`.

---

## Rule E — Known `{@html}` Exception Inventory (unchanged)

| Location | Content | Why safe |
|----------|---------|----------|
| `JsonLd.svelte` | JSON-LD structured data | Escaped via `JSON.stringify` |
| `Toast.svelte` | Internal SVG icon constants | Hardcoded, no user input |
| 4× form `pageDescription` | `serverPage?.pageDescription` | Server-controlled schema strings |
| `policies/[artifact_id]/+page.svelte` | `a.human_readable` | Admin-role only, internal policy text |
| `how-can-we-help/+page.svelte` | `NoteWorthyMessage()` | Returns hardcoded HTML strings based on `loanName` switch — no user input |
| `_archive/` components (3×) | Various | Archived, not mounted |

All non-exception instances use `sanitizeHtml()`.

---

## New Commit Review — `ef4f6ed6` + `91a605a5`

### `ef4f6ed6` — feat(contrast): WCAG AA token contrast audit + daily-review integration

**1,289 lines added** across 9 files. Creates a static-analysis toolchain under `scripts/contrast/` that:
- Parses CSS custom property declarations from `src/app.css` and `driver-theme.css`
- Resolves `var()` chains across 12 theme contexts (light + dark + 5 named schemes × 2 modes)
- Computes WCAG AA contrast ratios for 38 declared foreground/background pairs
- Composites translucent backgrounds onto declared surfaces before computing ratio
- Scans the codebase for usage sites of failing pairs
- Writes a markdown report + JSON results

**Security:** No user-facing code, no fetch calls, no HTML rendering. Pure dev tooling.

**Quality:** Well-structured with clear separation of concerns (6 modules). The `KNOWN_FAILURES` pattern with owner + reason is good practice. The `--strict` flag enables CI gating.

**Verdict:** Clean. See M4 for optional hardening recommendation.

### `91a605a5` — fix(theme): align color tokens to WCAG AA across all 12 themes

**CSS-only change** — 44 insertions, 12 deletions in `src/app.css`. Addresses 13 of 14 contrast failures flagged by the new audit:

- Muted text tokens darkened (3.5:1 → 4.8:1)
- Status pill dark-text tokens darkened (worst case 2.73:1 → 6.0:1)
- `--color-primary` remapped from primary-500 to primary-700 (2.15:1 → 5.2:1 with white text)
- Disabled button dark-mode overrides added (was 1.24:1)
- `--dash-accent-link` unified with `--dash-accent-text` (was 3.19:1)

**Notable:** The `--color-primary` change shifts the brand color slightly darker. This is a visual regression risk — buttons, primary surfaces, and accent colors will all appear darker bronze. The change is documented in the commit message and the contrast audit validates the new values.

**Verdict:** Clean. No logic changes. Every CSS comment includes before/after contrast ratios — excellent documentation practice.

---

## Observations (Informational)

### O1 — Clear Form fix required 5 commits (including 1 revert)

The sequence `58416903` → `f5b6fdde` → `9ff4bf50` (revert) → `9af809ec` → `f62b2fe2` shows iterative debugging of a subtle Svelte 5 reactivity race. The final fix (`f62b2fe2`) is architecturally correct — fixing at the source (mutator contract) rather than patching consumers. The intermediate commits (`f5b6fdde` using `window.location.assign`) were correctly identified as workarounds and reverted. Good engineering discipline.

### O2 — Numeric field clear fix includes sanitizeHtml patch

Commit `91dd9bdb` has two unrelated fixes bundled: (1) numeric field null-passthrough and (2) `{@html sanitizeHtml(question.description)}` in home-loan. The sanitization fix is correct and addresses Pitfall #15. Ideally these would be separate commits, but both are clean.

### O3 — Uncommitted working-tree changes

The working tree has uncommitted changes adding `minLimit`/`maxLimit` to ~12 questionBank files, a new test file (`numericFieldsHaveExplicitLimits.test.ts`), and a `schemaComposer.test.ts` update. This appears to be in-progress work related to Pitfall #14. Not reviewed here — will be covered when committed.

### O4 — Contrast audit establishes accessibility baseline

The `ef4f6ed6` + `91a605a5` pair establishes a WCAG AA compliance baseline for the first time: 456/456 declared token pairs pass across all 12 themes. This is a significant quality milestone. The `pnpm test:contrast:strict` CI gate prevents regressions. The explicit-pairs design (vs. auto-pairing) avoids false positives while documenting the design contract.

### O5 — CSS comments document contrast ratios inline

Every token change in `91a605a5` includes a WCAG-format comment (`/* WCAG AA: #hex on #hex is N.NN:1 — fails. #newhex → N.NN:1 */`). This is excellent practice — future editors can see the constraint directly at the declaration site without running the audit.

---

## Top 3 Actions for Next Session

1. **Verify M1** — Check `IncomeSourceForm.svelte` field-disable logic handles the "locked but absent" case (auto-locked key with no derived value). If it renders as disabled+empty, add a conditional: only lock when `specifics[key] !== undefined`.

2. **Add try/finally to M3** — Wrap `_companyTypeChangeConfirmed` flag in try/finally in `applicantFormManager.svelte.ts`. Low-risk but trivial to bulletproof.

3. **Commit the in-progress Pitfall #14 work** — The `numericFieldsHaveExplicitLimits.test.ts` and questionBank `minLimit` additions in the working tree look ready based on the diff stat. Run the test, confirm green, commit.
