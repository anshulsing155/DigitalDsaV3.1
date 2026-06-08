# Daily Code Review — 2026-05-04

**Scope:** 25 commits since the last review (`e1f3bf8c`, May 2). All by primary author (`tech@eyantrik.com` / Prashant). No teammate commits requiring extra scrutiny. Covers Session 96 form/validation fixes, the Phase 1–5 audit cleanup batch, and CLAUDE.md restructure.

**Standing grep rules (Rules A–D + Pitfall #9):** All 5 executed. Rules B, D clean (0 matches). Rule A: same known-safe inventory as May 2 — no new violations. Rule C: same 10 acceptable instances (error page, LanguageSelector, ResetDataButton, admin-only pages). Pitfall #9 (`typeof window !== 'undefined'`): 0 matches — still eradicated.

---

## Commits Reviewed

| Commit | Date | Subject | Verdict |
|--------|------|---------|---------|
| `073af2be` | Apr 28 | feat(validation): context-aware name validator (Phase 1) | **Clean — well-tested** |
| `c95baee5` | Apr 28 | test(pdf): behavioural test suite for pdfGenerator (Phase 3a) | **Clean** |
| `188ac9b4` | Apr 28 | test(relationships): coverage for relationshipValidator (Phase 3b) | **Clean** |
| `92221d63` | Apr 28 | test(visibility): coverage for form-engine visibility (Phase 3c) | **Clean** |
| `2a1e698b` | Apr 28 | refactor(formatNumber): consolidate to single canonical (Phase 4a) | **Clean** |
| `a7f27de4` | Apr 28 | refactor(schema): extract shared propertyAreaType options (Phase 4b) | **Clean** |
| `20a39afa` | Apr 28 | refactor(types): archive dead applicantSchema.ts (Phase 4c) | **Clean** |
| `50aa7a50` | Apr 28 | test(console): migrate home-loan form to clientLogger (Phase 5a) | **Clean** |
| `06718884` | Apr 28 | test(console): migrate 24 page files to clientLogger (Phase 5b) | **Clean** |
| `e2cefc5d` | Apr 28 | test(console): migrate state + storage files (Phase 5c) | **Clean** |
| `969563d2` | Apr 28 | test(console): migrate component + utility files (Phase 5d) | **Clean** |
| `a3c2d4cb` | Apr 28 | chore(eslint): promote no-console to error (Phase 5e) | **Clean** |
| `57c30ee0` | May 2 | fix(form): 7 cross-loan validation bugs across all 6 loan types | **Clean — large but symmetric** |
| `4aa1008e` | May 2 | fix(relationships): enforce marital status in validateRelationship | **Clean** |
| `873d7de1` | May 2 | fix(relationships): hard/soft cleanup on marital/age edits + startup scan | **Clean** |
| `901968c2` | May 2 | fix(form): four cross-cutting bugs from user report | **Clean — good payload fix** |
| `3a9c03c7` | May 2 | chore(pms): clear all 38 svelte-check warnings | **Clean** |
| `2eaa0635` | May 2 | docs(claude.md): add Pitfall #10 | **Docs only** |
| `c74bb2f7` | May 2 | docs: complete restructure of CLAUDE.md | **Docs only** |
| `f1245819` | May 2 | fix: 3 user-reported regressions (12th-pass, guarantor, modal) | **Clean — honest self-correction** |
| `d7dd0b23` | May 2 | fix(form): page-scope cross-step contradictions | **Clean — solid architecture** |
| `f64fbebf` | May 2 | fix(business-loan): explicit confirmation before entity-type changes | **Clean** |
| `fd936ddc` | May 2 | fix(business-loan): delete button + Role-in-Loan badge | **Clean** |
| `f318f552` | May 2 | fix(form): dynamic validation — Next re-disables for numeric 0 | **Clean — see M1 below** |
| `5d764a0a` | May 2 | fix(form): table-missing after delete + uniform dynamic validation | **Clean** |
| `3d41be45` | May 2 | docs(handoff): refresh Active Handoff for S96 | **Docs only** |

---

## Critical Findings

None. No security vulnerabilities or critical bugs detected.

---

## High-Priority Findings

None.

---

## Medium Findings

### M1 — `isFieldAnswered` minLimit default = 1 — future regression risk

**File:** [`formWizardEngine.ts:420`](src/lib/utils/formWizardEngine.ts:420)
**Confidence:** 75%
**Commit:** `f318f552`

The `isFieldAnswered()` function defaults `minLimit` to `1` for numeric fields. Any future required numeric field that legitimately accepts 0 (e.g., "number of dependents", "existing loan count") will be treated as "unanswered" unless the question schema explicitly sets `minLimit: 0`.

Currently no such field exists in the codebase (verified), so this is not a live bug — but it's a trap for the next schema author. The commit message documents the assumption clearly, which is good practice.

**Recommendation:** Add a one-line comment in the schema docs (or questionBank template) noting that numeric fields accepting 0 need explicit `minLimit: 0`.

---

### M2 — Entity name validator allows script-adjacent characters

**File:** [`checkGibberish.ts:46`](src/lib/utils/checkGibberish.ts:46)
**Confidence:** 65%
**Commit:** `073af2be`

The entity validator only blocks `[\x00-\x1F<>]` (control chars + angle brackets). Characters like `;`, `` ` ``, `{`, `}`, `"`, `'` are allowed. This is intentionally permissive (companies like "M&A Partners" or "7-Eleven" use special chars).

**Why this is acceptable:** SvelteKit auto-escapes `{expressions}` in Svelte templates. Entity names going into PDF use `pdf-lib` text draws (no HTML parsing). The `<>` block covers the primary XSS vector for any context where escaping might be missed. The entity name would need to reach an `{@html ...}` directive or a `dangerouslySetInnerHTML` equivalent to be exploitable — and neither is used for name rendering.

**Status:** No action needed. Documenting for audit trail.

---

### M3 — `hooks.client.ts` auth-failure reload

**File:** [`hooks.client.ts:46`](src/hooks.client.ts:46)
**Confidence:** 70%
**Flagged in:** Prior reviews (recurring)

The auth token refresh failure path calls `window.location.reload()`. This discards unsaved form state. Acceptable for auth failure (user needs to re-login), but the form auto-save debounce (5s) means up to 5 seconds of unsaved typing could be lost.

**Mitigation already in place:** Form pages auto-save on every significant field change with a 5s debounce. Recovery bin + applicant restore covers the bulk of lost-state scenarios. Acceptable risk.

---

## Observations (Informational)

1. **Excellent commit discipline** — Every commit has thorough root-cause analysis, verification steps, and test counts. The self-correction pattern in `f1245819` (acknowledging the `twelvePass` vs `12th_pass` mistake from the prior commit) demonstrates mature engineering process.

2. **Cross-form parity consistently maintained** — All 6 form pages updated symmetrically in `57c30ee0`, `f318f552`, and `5d764a0a`, matching CLAUDE.md Pitfall #12 requirements.

3. **Test count growth** — From 10,216 → 10,388 across the session (+172 tests). Coverage additions in pdf, relationships, visibility, and name validation.

4. **Warnings eliminated** — From 38 pre-existing svelte-check warnings → 0 after `3a9c03c7` + structural fixes.

5. **Obligation payload correctness** — `901968c2` properly distinguishes term-loan vs credit-line fields and converts `borrowerCount` from string to validated integer. This fixes a real schema-validation risk with the lender API.

6. **Page-scope contradictions** (`d7dd0b23`) — The `CONTRADICTION_PAGE_OWNERSHIP` map is a clean architectural fix that eliminates an entire class of Catch-22 UX issues across all form flows.

---

## Top 3 Actions for Next Session

1. **Audit numeric schemas for missing `minLimit: 0`** — Grep `type: 'number'` and `uiType: 'number'` across all questionBank files. Verify no field legitimately accepts 0 without an explicit `minLimit: 0`. Add it preemptively to "number of dependents" or similar if they exist.

2. **Onboarding raw-fetch audit** — [`BasicFields.svelte:70,88`](src/lib/components/onboarding/BasicFields.svelte:70) and [`AboutYou.svelte:78,92`](src/lib/components/onboarding/steps/AboutYou.svelte:78) use raw `fetch` on POST. Verify whether `/api/auth/check-email` and `/api/auth/send-email-verification` are behind CSRF middleware. If yes → need `secureFetch`. If no → document exemption (post-signup, pre-cookie-set flow).

3. **Snapshot count drift check** — The session regenerated snapshots twice (`57c30ee0` + `901968c2`). Run `pnpm test:unit -- --run schemaFixtureFactory` to confirm all 23+ snapshot files are in sync with current payload builder output.
