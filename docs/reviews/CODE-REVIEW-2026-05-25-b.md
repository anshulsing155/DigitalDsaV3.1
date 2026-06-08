# Enterprise Code Review — 2026-05-25-b (Delta Sweep)

**Profile:** Standard (T1-T6 + T9). 7 commits in scope; one substantive source commit (`7bd86512` — 7 discrete UI/validation bug fixes across 10 files) plus 5 docs-only commits and 1 micro-fix (F1 close from earlier review). No auth/payment code changes triggering Full profile.
**Reviewed against:** committed `main` @ **`7bd86512`** ("fix(forms): seven UI/validation bugs from BL + LAP user reports"), working tree clean.
**Prior review:** [`CODE-REVIEW-2026-05-25.md`](CODE-REVIEW-2026-05-25.md) (baseline @ `994f33e0`).
**Delta range:** `994f33e0..7bd86512` — 7 commits.

> **Note on timing.** This is the second review for 2026-05-25. The first review covered 5 commits (P16 alignment + STAKE split + Pitfall #48 + artifact landing). This review covers the 6 subsequent docs/chore commits plus one late-landing source commit (`7bd86512`) that was staged as uncommitted working-tree changes at conversation start.

---

## Header — Commands Executed

| Command | Status | Result | Delta vs `2026-05-25` |
|---------|--------|--------|------------------------|
| `pnpm check` | PASS | 0 errors, 0 warnings + registry integrity all rules pass | unchanged |
| `pnpm test:unit -- --run` | PASS | 201 files, **11,660 tests** | unchanged |
| `pnpm test:contrast` | PASS | **456/456 pairs** | unchanged |
| `git log … co-authored-by` | PASS | 0 matches (last week) | unchanged |

---

## Commits Reviewed (7, oldest first)

| SHA | Subject | Surface |
|-----|---------|---------|
| `4a7211e0` | docs+chore: daily code review 2026-05-25 + close F1 (stale ≤25% comments) | **source** — 1 file (`applicantRoleUtils.ts`, 4 ins / 2 del) + review doc |
| `c3c5c21b` | docs: D.1 spec sign-off critique + 2026-05-22 AM CHANGELOG backfill + 5-25 contrast audit | docs only (CHANGELOG, 2 new review docs) |
| `e2a82e71` | docs(epic-d): lock Razorpay as v1 leaf provider (ADR-0014 Accepted) | docs only (DEVELOPMENT-PLAN, SESSION-HANDOFF, ADR-0014, D-1 spec) |
| `2a1b28db` | docs(D.1): sign-off-ready — all 6 §11 lock-downs decided + P0/P1 critique fixes | docs only (DEVELOPMENT-PLAN, SESSION-HANDOFF, D-1 spec) |
| `68093f13` | docs(D.1): close remaining critique items + plan-change policy + SEC-8 hard prerequisite | docs (CLAUDE.md §8 restructure + ADR-0014 + D-1 spec) |
| `6c3f3de1` | docs(D.1): APPROVED — 16 additional UX/operational decisions locked in §11.2 | docs only (DEVELOPMENT-PLAN, SESSION-HANDOFF, ADR-0014, D-1 spec) |
| `7bd86512` | fix(forms): seven UI/validation bugs from BL + LAP user reports | **source** — 10 files (184 ins / 21 del) |

---

## Standing Grep Rules — T1-T6 Sweep

| Rule | Tier | Result | Delta vs prior |
|------|------|--------|----------------|
| **A (CSRF)** — raw POST/PUT/DELETE/PATCH fetch outside `secureFetch` | T1 | 0 in `src/lib` + `src/routes` | unchanged |
| **E/E2 (XSS)** — `{@html}` outside `sanitizeHtml` | T1 | only documented exceptions (Toast, JsonLd, `_archive`, `pageDescription`, NoteWorthyMessage, admin policies, F2-commented IncomeSourceForm) | unchanged |
| **F/OBS-1 (server logger)** — bare `console.*` in server code | T1 | 5 hits all legitimate: `logger.ts` (2), `telemetry.ts` (3) | unchanged |
| **F (API routes)** — bare `console.*` in `routes/api` | T1 | 2 hits: both `// //console.log` commented-out diagnostics in `init-widget`/`resend-otp` | unchanged |
| **G (Co-Authored-By)** | T1 | 0 in last week | unchanged |
| **SEC-1 (hardcoded secrets)** | T1 | all matches are test files / `_archive` | unchanged |
| **SEC-4 (eval/exec)** | T1 | 0 eval/new Function in src | unchanged |
| **SEC-5 (env public exposure)** | T1 | `VITE_VAPID_PUBLIC_KEY` only | unchanged |
| **SEC-7 (client storage PII)** | T1 | unchanged count pattern | unchanged |
| **B (Capacitor proxy at scope)** | T2 | 0 | unchanged |
| **C (window.location.reload)** | T2 | 13 instances in approved locations | unchanged |
| **I (`typeof window` SSR guard)** — Pitfall #9 | T2 | 0 | unchanged |
| **J (module-scope `fetch`)** — Pitfall #4 | T2 | 0 | unchanged |
| **H1 (`state_referenced_locally`)** — Pitfall #10 | T3 | 0 (`pnpm check` clean) | unchanged |
| **K (JSON-Logic `!=` null)** — Pitfall #1 | T3 | smell-grep: 43 config files, all value comparisons | unchanged |
| **M (`combinedAnswers` collision)** — Pitfall #13 | T3 | 0 non-whitelisted uses in components | unchanged |
| **CQ-1 (empty catch)** | T3 | 0 | unchanged |
| **CQ-3 (JSON.parse(JSON.stringify))** | T3 | test files only (exempt) | unchanged |
| **CQ-4 (+error.svelte coverage)** | T3 | 4 error boundaries: root, `(app)`, `(auth)`, `dashboard` | unchanged |
| **CQ-5 (TODO/FIXME/HACK/XXX)** | T3 | 41 across 17 files | unchanged |
| **S (contrast audit)** | T3 | 456/456 | unchanged |
| **PH-1 (security headers)** | T5 | unchanged | unchanged |
| **PH-5 ($where/$function)** | T5 | 0 | unchanged |
| **PERF-1 (import \*)** | T6 | 3 (iconRegistry, deriveFlagKeys, camera) — all acceptable | unchanged |
| **PERF-3 (invalidateAll)** | T6 | unchanged — no `+page.server.ts` mutations in delta | unchanged |
| **BUILD-3 (typecheck)** | T3 | 0/0 | unchanged |
| **BUILD-4 (tests)** | T3 | 11,660/11,660 | unchanged |

### T4 — Conditional Rules

| Rule | Triggered? | Result |
|------|-----------|--------|
| **Q (engines.node pin)** | not triggered (no `package.json` touched) | n/a |
| **P28 (TanStack `$Query.` prefix)** | check ran | 1 match in `queryClient.ts:26` — JSDoc teaching example. Allow-list. |
| **P30 (component-local `restoreAskedForKey` `$state`)** | check ran | `BasicInfoFields.svelte:74` plain TS, not `$state`. Compliant. |
| **P38 (loan-switch chokepoint)** | check ran | `migrateApplicantsToRecoveryOnLoanSwitch` at exactly 2 sites (orchestrator + cleanup definition). Compliant. |
| **P42 (reload-detection)** | check ran | only `isReloadOfCurrentPath.ts` + tests + e2e specs touch `getEntriesByType('navigation')`. Compliant. |
| **P47 (pre-submit ConfirmModal wiring)** | check ran | 6 `confirmAndSubmit(` call sites, 0 direct `submitFormForEvaluation(` outside wrapper. Compliant. |

### T9 — Cross-Team Blast Radius

| Check | Result |
|-------|--------|
| **BLAST-1 (shared module changes)** | `applicantRoleUtils.ts` — 2-line comment update only (F1 close). No behavioral change, no consumer impact. |
| **BLAST-2 (type file changes)** | 0 type files touched |
| **BLAST-5 (store/state changes)** | 0 stores touched. Fix 2 (RelationshipCapture) changes write timing to `formState.applicationData` but doesn't add/remove fields. |
| **BLAST-9 (multi-author)** | single author (Prashant) |
| **Form components touched** | `AddApplicantBusiness`, `ApplicantFormUnsecured`, `IncomeSourceForm`, `RelationshipCapture` — 4 shared form components. All changes are additive (new guards, new derived state) or narrowly scoped (entity-type sync). No removals, no interface changes. |
| **Question bank changes** | `businessLoan/loanRequirement.ts`, `homeLoan/existingLoan.ts`, `lapLoan/existingDetails.ts` — schema changes are additive (new validation rules, required flag flip). No key renames, no option removals. |
| **Page template changes** | 3 secured-loan `+page.svelte` files get identical 4-line `maxSelection` additions. Symmetric. |

---

## Findings

### No new findings.

Prior F1 (stale "≤ 25%" comments in `applicantRoleUtils.ts`) was **closed** by commit `4a7211e0` — both lines 287 and 316 now reference `STAKE_FULL_FINANCIALS_THRESHOLD (20%)`.

---

## Commit-Level Analysis

### `4a7211e0` — docs+chore: daily code review 2026-05-25 + close F1

**Closes F1 from the 2026-05-25 review.** Two stale comments in `applicantRoleUtils.ts` (`≤ 25%` → `≤ STAKE_FULL_FINANCIALS_THRESHOLD (20%)`) at lines 287 and 316. Code was already correct; comments now match. Also lands the `CODE-REVIEW-2026-05-25.md` report. Verified: the comment text accurately reflects the gate behavior (`ownershipPercent > STAKE_FULL_FINANCIALS_THRESHOLD` → the comment's `≤` is correct for the skip condition).

---

### `c3c5c21b` — docs: D.1 spec critique + CHANGELOG + contrast audit

**Pure docs.** Three artifacts: D1-SPEC-CRITIQUE-2026-05-25.md (269 lines — structured critique with 4 P0 + 11 P1 + 5 P2 + 4 P3 + 4 MISS findings), CHANGELOG backfill for 2026-05-22 AM session, and CONTRAST-AUDIT-2026-05-25.md (auto-generated). No PII in any doc.

---

### `e2a82e71` — docs(epic-d): lock Razorpay as v1 leaf provider

**Pure docs.** ADR-0014 status flipped from "Proposed" to "Accepted". D-1 spec updated with Razorpay-specific implementation notes. SESSION-HANDOFF and DEVELOPMENT-PLAN refreshed to reflect the decision. No source changes.

---

### `2a1b28db` — docs(D.1): sign-off-ready

**Pure docs.** D-1 spec receives 111 lines of additions — all 6 §11 lock-down decisions documented, P0/P1 critique fixes applied. DEVELOPMENT-PLAN updated with S1-S8 implementation timeline. No source changes.

---

### `68093f13` — docs(D.1): close remaining critique items + SEC-8 prerequisite

**CLAUDE.md §8 restructure + docs.** The Production Blockers table gains a "Gating event" column distinguishing SEC-7 (Beta launch, deferred per user decision 2026-04-22) from SEC-8 (D.1 recurring-billing launch — **bumped from beta-deferral to hard prerequisite** per D.1 spec risk R15: spam-filtered dunning emails = silent downgrade). The instruction paragraph now explicitly says "Do raise SEC-8 when planning S5 dunning." This is a correct documentation improvement — SEC-8's urgency changed with D.1 approval.

---

### `6c3f3de1` — docs(D.1): APPROVED — 16 UX/operational decisions

**Pure docs.** D-1 spec §11.2 gains 16 owner-decided policies: dunning window 8d, no cancel refund, 90d pause auto-cancel, BANK_DECLINED retry, manual Retry-now button, persistent dunning banner, 7d S8 migration window, admin-only D.3 refund, transaction history in S6 panel, pricing-change deferred, no webhook backup, `paused_from_state` pattern, ₹1 disclosure, pre-charge reminder 3d, branded failed-charge email, 3d grace for S8 legacy. Spec status flipped to "APPROVED". No source changes.

---

### `7bd86512` — fix(forms): seven UI/validation bugs from BL + LAP user reports

**Substantive source commit.** 10 files changed (184 ins / 21 del). Seven discrete fixes, each reviewed individually:

**Fix 1 — AddApplicantBusiness entity-type sync** (+11 lines)
Syncs `companyType` back to `formState.applicants` when entity-type selection changes. Previously only the local `companyForm` buffer was updated, so Pvt Ltd → OPC → Pvt Ltd left the Added Applicants table showing "OPC."
- *Correctness*: Conditional on `existing.companyType !== config.companyType` — no unnecessary writes.
- *Scope*: Maps over all Company applicants, but Business Loan has exactly one Company per case. Safe.
- *Pattern*: Follows Pitfall #25 (persist immediately, don't defer to Next).

**Fix 2 — RelationshipCapture partial-persistence** (+17 / -12 lines)
Splits one `$effect` into two: (a) persist `$userRelationships` to `formState.applicationData` on every change; (b) gate `isNextEnabled` on `graphStatus.isComplete`. Previously both were bundled — persistence was gated on completeness, so Previous → return lost all partial work.
- *Correctness*: `untrack()` on `formState.applicationData` preserved to avoid infinite read→write loop.
- *Pitfall #25 compliance*: Yes — data persists immediately.
- *Reactivity*: Two separate effects with clean dependency boundaries. No over-triggering risk since relationship edits are discrete user actions.

**Fix 3 — businessLoan loanAmount required:true** (+4 / -4 lines)
Flips `q2_loanAmount.required` from `false` to `true`. Rewords three description copy branches to remove "Leave blank" language.
- *Behavioral change*: DSAs can no longer skip the amount field. Commit message documents UX rationale (users typed, deleted, were confused Next stayed enabled).
- *XSS check*: Description HTML is server-controlled schema content (existing allowlist). No new vectors.

**Fix 4 — Top-up maxSelection={1}** (+4 lines × 3 pages)
Adds `maxSelection={1}` to `MultipleSelectField` for `q2_assessmentLenders` when `loanType === 'Top-up Only'` in home-loan, LAP, and plot-loan pages.
- *Parity*: All 3 secured-loan pages updated. Unsecured loans don't have a top-up variant — correctly excluded.
- *Component compatibility*: `MultipleSelectField` declares `maxSelection?: number | null` with default `null`. The `null` fallback for non-top-up is handled correctly (`isAtMaxSelection` checks `!== null` first).
- *Type safety*: `(combinedAnswers as any).loanType` — follows existing pattern in these templates.

**Fix 5 — Cross-field EMI plausibility for Home + LAP** (+43 / +52 lines)
Adds two JSON-Logic warning rules on the existing-loan EMI question:
- Lower bound: EMI ≥ 0.9 × (principal / tenure-in-months) — below zero-interest floor
- Upper bound: EMI ≤ 1.6 × (principal / tenure-in-months) — catches typo extra zero
Both rules guard with `> 0` checks on principal and tenure to prevent division by zero.
- *Field-name correctness*: Home Loan uses `remainingTenure`, LAP uses `originalRemainingTenure` — both match their respective bindsTo keys.
- *Pitfall #1 check*: No `!=` operators used. Rules use `<`, `>`, `and`, `*`, `/` — all safe.
- *Plot Loan exclusion*: Explicitly documented — remaining tenure is a categorical string select, not numeric.
- *Math verification*: Zero-interest floor = principal/months. 0.9× allows 10% slack for partial-EMI quirks. 1.6× catches one-extra-zero typos without false-alarming on legitimate high-rate/short-tenure loans. Sound.
- *Warning message*: Static text ("even at 0% interest you would need ₹(principal ÷ months)") — no computed value interpolation. Acceptable given JSON-Logic limitation.

**Fix 6 — IncomeSourceForm company dropdown dedup** (+17 / -1 lines)
Filters `companyNameOptions` to exclude companies the applicant already has a `director_company` entry for in ADD mode. When editing, the current entry's company stays visible.
- *Correctness*: `editingEntry?.sourceCompanyId` handles undefined with optional chaining. `Set.delete(undefined)` is a no-op.
- *Svelte 5 pattern*: Uses `$derived.by()` for complex derived logic — correct.
- *Edge case*: If the applicant has no existing entries, `usedCompanyIds` is empty and all options show. Correct.

**Fix 7 — ApplicantFormUnsecured relationship page skip for known runners** (+27 / -2 lines)
Adds `skipRelationshipForKnownRunner` derived state. When all non-proprietor Individuals are auto-business_runners with known relations (not 'other'), skips the relationship capture page.
- *Navigation parity*: Applied to all 3 navigation paths: `getNextTarget()`, `handleGpaPrevious()`, and Income-step `handlePreviousClick`. No dead-end possible.
- *Edge cases*: If DSA manually adds a non-runner Individual, `every()` returns false → page shown. If relation is 'other', not skipped → correct (genuinely unknown relation).
- *Type casts*: `(a as any).applicantSubType` etc. — matches existing pattern in the unsecured flow.
- *Scope*: Business Loan only (sole-prop with business runner). Personal/Professional don't have this concept. No cross-loan parity needed.

---

## Security Surface Summary

| Surface | This delta | Notes |
|---------|-----------|-------|
| New endpoints | 0 | no `+server.ts` files touched |
| New `{@html}` | 0 | description copy changes are in existing schema HTML (allowlisted) |
| New JSON-Logic rules | 4 (2 per loan: lower + upper EMI bound) | Pure validation warnings, no data mutation |
| CSRF | 0 | no new fetch calls |
| CLAUDE.md §8 change | Documentation restructure only | SEC-8 bumped to D.1 prerequisite — no code impact |

---

## Performance Impact Summary

| Surface | Notes |
|---------|-------|
| `RelationshipCapture` persistence change | Now writes on every relationship edit vs only on completion. Negligible — `replaceApplicationData` is a rune setter, ~0ms. |
| `IncomeSourceForm` company dedup | `$derived.by()` iterates `existingEntries` (typically 1-5 items) + `assembleCompanyNameOptions` result (typically 1-3 companies). Negligible. |
| `skipRelationshipForKnownRunner` derived | Filters `formState.applicants` (typically 2-4 items). Negligible. |
| JSON-Logic EMI rules | Two additional rule evaluations per EMI field change. JSON-Logic evaluation is ~0.1ms per rule. Negligible. |
| Top-up `maxSelection` conditional | Template expression evaluated once per render. Negligible. |

---

## Cross-Team Blast Radius Summary

Four shared form components touched (`AddApplicantBusiness`, `ApplicantFormUnsecured`, `IncomeSourceForm`, `RelationshipCapture`). All changes are additive (new guards, new derived state, new conditional props) or narrowly scoped (entity-type sync). No interface changes, no prop removals, no behavioral regressions for unaffected flows.

Three question bank files changed — all additive (new validation rules, required flag flip). No key renames, no option removals.

Three secured-loan page templates get identical 4-line changes — symmetric by construction.

Single-author delta, no cross-team regression risk.

---

## Known-Safe Inventory Updates

- **`{@html}` allowlist**: Unchanged — `loanRequirement.ts` description HTML is in the existing "server-controlled schema strings" category.
- **Server `console.*` allowlist**: Unchanged.
- **`window.location.reload()` inventory**: Unchanged (13 instances).
- **`STAKE_*` constant inventory**: Unchanged from prior review.
- **`maxSelection` usage**: NEW — `q2_assessmentLenders` now conditionally limited to 1 for Top-up Only across all 3 secured-loan pages.

---

## Observations

- **Seven-fix bundled commit is well-structured.** Each fix is independently reversible, clearly narrated in the commit message, and addresses a user-reported bug. The commit message explicitly documents follow-ups (Plot Loan cross-EMI, business-runner gender/age constraints) — good scope discipline.
- **Fix 2 (RelationshipCapture) is the canonical Pitfall #25 application.** The gated-on-completion → always-persist change is exactly what the pitfall warns about. Worth mentioning in future Pitfall #25 "last verified" updates.
- **Fix 5 (cross-field EMI) demonstrates good parity thinking.** Home Loan and LAP both get the rules. Plot Loan is excluded with documented rationale (categorical tenure). Personal/Business/Professional loans don't have this obligation structure.
- **CLAUDE.md §8 restructure is important for project governance.** SEC-8 (email hardening) is now explicitly flagged as a D.1 launch prerequisite, not just a vague "before production" blocker. This makes the dependency chain visible: S5 (dunning) → SEC-8 → D.1 launch.
- **D.1 spec reached APPROVED status across commits `2a1b28db` through `6c3f3de1`.** Implementation (S1-S8 sequence) is now cleared to start. The next substantive review will likely cover S1 (subscription state model + MockProvider).

---

## Top 5 Actions for Next Session

1. **S1 implementation start** — subscription state model (`src/lib/server/billing/subscriptionState.ts`) + MockProvider + R11 test driver + ~50 unit tests. First source-heavy commit in the D.1 implementation sequence.
2. **Plot Loan cross-EMI validation** (follow-up from Fix 5) — needs a tenure-select-to-months mapping since Plot uses categorical strings. Not urgent but should be addressed before the next release.
3. **Business-runner data-capture surface** (follow-up from Fix 7) — gender lock + age-gap validation for the runner co-applicant. Separate session.
4. **Pre-existing `/form/how-can-we-help` 500** — carries forward from 2026-05-24. Per-user data condition for un-onboarded DSA account; not caused by any commit in this or prior delta.
5. **SEC-8 (email hardening) scheduling** — now a hard prerequisite for D.1 launch. Must be slotted before S5 (dunning). Plan visible in D-1 spec.
