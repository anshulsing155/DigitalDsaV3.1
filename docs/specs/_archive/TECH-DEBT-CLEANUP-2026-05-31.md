---
type: spec
epic: tech-debt-cleanup-2026-05-31
status: shipped
last_verified: 2026-06-02
related_specs: [LOAN-FIELD-NOMENCLATURE-EXECUTION-PLAN.md]
related_adrs: [ADR-0020, ADR-0024]
test_coverage: [src/lib/testing/__tests__/plotEquityPayloadPatchLock.test.ts, src/lib/testing/__tests__/payloadBuilderTimeInjection.test.ts, src/lib/testing/__tests__/wizardSidebarPageGatesLock.test.ts, src/lib/testing/__tests__/legacyPayloadFieldsAbsent.test.ts]
owner: tech@digitaldsa.com
---

# Tech-Debt Cleanup — 2026-05-31

## §0 — Session log

| Session | Date | Commit(s) | Items advanced | Status |
|---|---|---|---|---|
| S207 | 2026-05-31 | `535e99da` (fixes), `e211595a` (UI refactor, off-plan) | D13 (gates, no lock test), D14 (partial — 4 questionBank + 3 comments) | 🟡 partial — 2 items advanced, neither closed |
| S208 | 2026-06-01 | `debae82c` (Session 1 close-out) | D3 ✅ (interfaces deleted), D11 ✅ (Pitfall #33 marker confirmed pre-existing), D12 ✅ (memory file RESOLVED header), D14 ✅ (grep-sweep complete — 2 comments fixed, remaining hits classified) | 🟢 Session 1 closed cleanly — 4 items shipped |
| S208.5 | 2026-06-01 | `362e3041` (Session 1.5 snapshot triage) | D-incoming-3 ✅ (snapshot lock CI-blocking failures resolved by regenerating 4 fixtures via the project's existing `_regenLapSnapshots.test.ts` mechanism — now lock canonical post-rename state per §16.16) | 🟢 CI unblocked — 8 failures → 0 |
| S209 | 2026-06-01 | `216aa108` (Session 2 prop rename) | D1 ✅ + D2 ✅ — `loanVariant` → `loanScope` rename across the misnamed-scope chain (16 files: 5 components, 1 type module, 6 route +page.svelte files, 4 test files) + `OBLIGATION_IMPLIED_TYPES` → `SCOPES_THAT_IMPLY_OBLIGATIONS`. Path A (rename only, no `loanPurpose` axis split) per owner decision. | 🟢 Session 2 closed cleanly — 2 items shipped, no behavior change |
| S210 | 2026-06-01 | `94aea8cb` (Phase 2: time injection), commit pending (Phase 3-5: audit fixups) | **Phase 2:** D-incoming-4 ✅ Level-3 architectural — payload-builder chain accepts `opts?: { now?: Date }`; new lock test `payloadBuilderTimeInjection.test.ts` enforces the discipline; `FIXTURE_NOW` defaults make snapshot tests deterministic. **Phase 3-5:** D-incoming-5 ✅ (plot-loan/+page.svelte:1526 — Plot Loan obligation now receives canonical scope), D-incoming-1 ✅ (showWhenTransform fixture shape), plus 5 critical drift items surfaced by parallel audit agents — formPathScenarios (5 Plot rows), formPathAuditor (5 Plot rows + FormPath interface), archetypeTemplates (10 Plot entries + interface), archetypeHelpers (loanVariant propagation), plotLoan.ts comment rewrite. | 🟢 Path B "Level-3 proper fix" shipped — architectural determinism + corpus-wide audit findings closed |
| S211 | 2026-06-01 | `a24ab09e` (Commit 1: D4 core + cascade + coverageReport), `dcaa5a3d` (Commit 2: LoanType type + 3 constants + 7 consumers), commit pending (Commit 3: D6/D10/D15 + spec) | **Commit 1:** D4 core — E2eFillConfig rename (`loanType` carried loanName → `loanName`; `loanVariant` carried scope → `loanType`) + 3 cascade consumers + LoanTypeCoverage → LoanNameCoverage. **Commit 2:** LoanType type alias → LoanName + LOAN_TYPES/SECURED_LOAN_TYPES/UNSECURED_LOAN_TYPES constants → _NAMES + 4 interface field renames + 7 consumer files (combinationGenerator 31 sites, helpers, storage, TestDataManagerTab, test-dashboard server route, schemaAlignment.test, profileGeneration.test). **Commit 3:** D6 EligibilityCalculator internal `'LAP'` value aligned to canonical `'Loan Against Property'` (per CLAUDE.md §16 Rule #15 — calculator now ready for future rule-engine wiring without translation) + D10 CaseRouteSummary display-only lock comment + D15 Flexi DOD intentional-gating comments in BL/Prof loanRequirement. | 🟢 Session 3.5 closed cleanly — 4 items (D4, D6, D10, D15) shipped, zero new files, full canonical vocabulary alignment in testing-infra |
| S212 | 2026-06-02 | commit pending (D13 lock test + 2 production-dead bug fixes) | **D13** — New lock test `wizardSidebarPageGatesLock.test.ts` (7 tests) walks all 6 wizardSections + each loan's `getAllPages()` and asserts two rules: R1 (referential integrity — every `pageIds[]` entry resolves to a real page) + R2 (sidebar/page gate pairing — every gated page must have a paired subsection or parent-section gate). KNOWN_GATE_PAIRINGS allowlist is empty (no exemptions needed after patches). Test caught **2 real production-dead bugs in the first run**: (a) Business Loan sidebar showed a "Company Financials" chip pointing at `companyFinancialsPage`, which had been intentionally removed from `businessLoan/pages.ts` getAllPages() in an earlier refactor (data captured in applicant modal instead). Chip was dead UI for Company applicants. **Fixed:** subsection removed from `wizardSections/businessLoan.ts` with §16 Rule #15 sunset comment. (b) Home Loan "Location" subsection had no `showWhen` despite `propertyLocation_homeLoan` page being gated to `assessmentStatus != ''`. Chip rendered before page mounted → click would jump to a page that immediately hides itself. **Fixed:** added matching `showWhen` to subsection. | 🟢 Session 4 closed cleanly — D13 ✅ end-to-end (gates AND lock test AND 2 emergent dead-UI fixes). Net new files: +1 (lock test — Rule #14 legitimate exception per spec §5 Session 4) |
| S213 | 2026-06-02 | `b688040e` (Path B — D5/D8/D9 + dual-tenure pitfall + ADR-0024) | **D5** axis-documentation comment for `'Business Loan - Unsecured'`. **D8** Start Fresh sunset — formSchema.json q4_loanType value `'Start Fresh with New Loan'` → canonical `'New Loan'` (label preserved). Owner MongoDB count verified zero stored cases. Chain cleanup. **D9 partial** — `mapLoanType.ts` archived (was phantom-import dead code; DC→BT mapping would have been conceptually wrong per ADR-0024 D-1). **Dual-tenure architectural finding deferred (Path B)** — engine's universal BT+Top-up dual-tenure assumption is wrong for single-loan-backend lenders + conditional lenders; full `bt_topup_treatment` per-lender flag design preserved in PITFALLS.md #69 + KNOWN LIMITATION block at `evaluationEngine.ts:854` + ADR-0024 D-4. **ADR-0024** codifies DC ≠ BT distinction + Start Fresh sunset + mapLoanType archive + dual-tenure deferral. | 🟢 Session 5 closed cleanly — Path B per owner. D5 ✅ + D8 ✅ + D9 partial. Dual-tenure deferred with full design preserved. 12,898 tests passing. |
| S214 | 2026-06-02 | commit pending (D7 archive + offers architecture doc) | **D7** closes bank-loan-management archival end-to-end. Investigation surfaced the surface was 100% dead-code by S214: 3 submit functions never called; 6 storage helpers fed 2 offer routes whose localStorage keys had no writer; the 2 outbound shims built payloads that were never sent (only used for client-side existence-check validation). **Archives**: `homeLoanApi.ts` → `_archive/homeLoanApi-S214.ts`; 2 offer routes → `_archived_topup-loan-offers/` + `_archived_balance-transfer-offers/` (Pitfall #63 compile-stub pattern); `OFFERS.TOPUP` / `OFFERS.BALANCE_TRANSFER` URL constants removed from `routes.ts`. **Shim removal**: lap/+page.svelte full cleanup (loanTransaction $state + finalApplicants build + formattedPayload PascalCase costume all removed; validation now reads `combinedAnswers` directly). plot-loan/+page.svelte validation-only refactor — surrounding scaffolding blocked from removal by `plotEquityPayloadPatchLock.test.ts` (lock ratifies transitional state per §16 Rule #16 — Plot & Equity payload-patch reform logged to §6). **Lock test extended**: `legacyPayloadFieldsAbsent.test.ts` now also asserts no `$lib/services/homeLoanApi` importers. **Documentation**: new `docs/OFFERS-ARCHITECTURE.md` captures the live offers pipeline end-to-end (DSA form → confirmAndSubmit → evaluating → POST /api/evaluate-and-persist → rule engine → MongoDB snapshots → /dashboard/dsa/cases/[case_id]/results display). ADR-0020 footnote documents the archival. | 🟢 Session 6 closed cleanly — D7 ✅ end-to-end. All 15 spec items now resolved or archived. 12,899 tests passing. |
| S215 | 2026-06-02 | commit pending (B + A + C bundle) | **§6 closure session.** Three follow-ups in B → A → C order. **B** — `'Business Loan - Secured'` case-level dead handlers cleanup. 6 production sites + 3 tests removed; 1 axis-documentation comment updated to post-cleanup state; §6 entry marked ✅. Net -2 tests (BLS prefix `it` block + deriveFixtureName Secured row). String remains LIVE on obligation taxonomy + policy taxonomy + RM-portfolio axes. **A** — Plot & Equity payload-patch reform via path (c). Both patch blocks at `plot-loan/+page.svelte:1015-1028` removed; `plotEquityPayloadPatchLock.test.ts` fully rewritten as a canonical-absence lock (5 tests → 4 tests, per §16 Rule #16 — guards canonical state, not the transitional state that ratified a never-reached-engine bug); **new Pitfall #71** in PITFALLS.md documents the form-page-level payload-mutation trap + the 3 canonical layers for legitimate overrides (form-state effect / builder / enricher). Semantic intent (Plot & Equity needs special purchaseType + differentATSandPV) folded into LEND-1 Phase 2 redesign. The surrounding `payloadNew`/`payload` scaffolding cleanup in plot-loan (~150 lines) is now UNBLOCKED — folded into LEND-1 Phase 2 as well. **C** — spec frontmatter `status: shipped`; §11 spin-offs section added (PLOT-BT `loanVintageMonths` time-bomb + Smart* calculator alignment go to DEVELOPMENT-PLAN backlog; per-lender dual-tenure flag + Unsecured DC+Extra payload bridge stay in PITFALLS #69 + ADR-0024 D-4 + KNOWN LIMITATION block); file moved to `docs/specs/_archive/`. **Net tests: -3** (B: -2, A: -1 — lock dropped one redundant test) → 12,896 passing. Type-check 0/0. **Bonus chip surfaced**: enricher gap at `payloadEnricher.ts:976-998` doesn't normalise `direct_from_developer` / plain `resale` (the Plot Loan form's actual values). Captured in PITFALL #71 Detection section + LEND-1 Phase 2 task description. Needs lender-policy audit before any patch. | 🟢 Session 7 closed cleanly — §6 closure complete + spec archived. 12,896 tests passing. |

**S207 efficiency notes** (per CLAUDE.md §16 Rules #14-16):
- ✅ 0 violations. New lock test `plotEquityPayloadPatchLock.test.ts` justified per Rule #14 (replaces recurring manual audit work). All new comments with legacy references include sunset triggers per Rule #15. New lock guards canonical state (`loanVariant`) and negatively asserts dead pattern per Rule #16.
- ⚠️ S207's 3 production-dead bug fixes (BT+Top-up dual-tenure gate, Plot & Equity payload patches, Plot Loan `confirmAndSubmit` arg) are NOT in the 15-item §3 inventory but are real cleanup work — surfaced opportunistically while reading the WIP diff for the planned cleanup. They are pre-rename artifacts that became visible only because the canonical post-rename state is now everywhere else. Not a spec gap; an emergent finding pattern.
- 📌 ~~**Open for next session:** D13's Definition-of-Done lock test (`wizardSidebarPageGatesLock.test.ts`) and D14's exhaustive grep-sweep are the highest-value pickups (~30 min combined) before pivoting to D1/D2 (Session 2 prop rename).~~ **D14 grep-sweep closed in S208.** D13 lock test still pending — moves to Session 4 per original plan.

**S208 efficiency notes** (per CLAUDE.md §16 Rules #14-16):
- ✅ 0 violations. Net file count: **-1** (deleted 0 files but removed 3 dead interfaces totaling 51 lines from `loanTypes.ts` — Rule #14 compliant since deletion shrinks debt). No new files. Zero new "kept for back-compat" comments — the institutional-memory headers added to `loanTypes.ts` and the memory file reference ADR-0020 as their sunset citation per Rule #15. No new lock tests (D3 is a delete, not a code-pattern that needs locking) — Rule #16 not applicable to this session.
- 📌 **Open for next session:** D1, D2 (Session 2 prop rename: `loanVariant` → `loanScope` across IncomePageNew, ObligationCapture, applicantRestoreHandler + `OBLIGATION_IMPLIED_TYPES` rename). Estimated 90 min. Path A locked per owner decision 2026-05-31 (rename only, no `loanPurpose` axis split).

**S208.5 efficiency notes** (per CLAUDE.md §16 Rules #14-16):
- ✅ 0 violations. Net file count: **0** (4 snapshot fixtures modified — `PLOT-BT.pre-migration.json`, `LAP-BT-TERM.pre-migration.json`, `LAP-TOPUP-TERM.pre-migration.json`, `LAP-BT-TOPUP.pre-migration.json` — none added, none deleted). Used the project's existing `_regenLapSnapshots.test.ts` regen mechanism (`REGEN_LAP_SNAPSHOTS=1`) rather than hand-editing or deleting the locks. Rule #14 compliant (no new files). Rule #15 compliant (no new back-compat comments). Rule #16 compliant (regenerated snapshots lock the canonical post-rename engine output — `loanType: 'Balance Transfer Only'` + `facilityType: 'Term Loan'` + retired `LAPType`/`unSecureLoanType` absent — verified via key-set spot check on LAP-BT-TERM).
- ⚠️ Surfaced a separate time-bomb in PLOT-BT snapshot: `loanVintageMonths` is computed as `now - loanDisbursementDate` (where disbursement is fixed `"2016-04"`). The lock will drift by +1 every month and fail again ~2026-07-01. Logged as D-incoming-4 below.
- 📌 **Open for next session:** unchanged — D1, D2 still next (Session 2).

**S210 efficiency notes** (per CLAUDE.md §16 Rules #14-16):
- ✅ 0 violations across both phases. Phase 2 commit `94aea8cb`: net file count +1 (lock test `payloadBuilderTimeInjection.test.ts`, Rule #14 legitimate exception — replaces recurring manual audit work). Phase 3-5 commit: net 0 (mods only). All new comments anchor to ADR-0020 + S210 attribution per Rule #15. Lock test guards canonical post-refactor state per Rule #16.
- ⚠️ Parallel fixture-audit agents (3 in parallel: snapshots / journeys+factory / e2e+remaining-tests) returned a critical finding NOT in the original §3 inventory: 10 Plot scenario+auditor sites and 10 Plot archetype sites had variant values misfiled on `q4_loanType` (or `loanType` in archetypes). These silently bypassed post-rename `loanVariant`-keyed gates — a real test-coverage gap. Same pattern as D-incoming-5 (the plot-loan/+page.svelte:1526 bug). Fixed inline in S210 Phase 3-5 rather than deferred — fit the "without patchwork" mandate.
- 📌 **Open for Session 3.5** (remaining cluster, deferred from this session due to scope discovery): D4 (`payloadToFillInstructions.ts` rename) + bundled lying-name cleanup (`dataFillHelpers.ts`, `combinationGenerator.ts`, `coverageReport.ts`). Plus D6 (EligibilityCalculator alignment) + D10 (CaseRouteSummary display-only verify) + D15 (Flexi DOD documentation). Estimated ~90 min batched.

**S211 efficiency notes** (per CLAUDE.md §16 Rules #14-16):
- ✅ 0 violations across all 3 commits. Net file count: **0** (zero new files, zero deletes — 14 files modified across 3 commits). Rule #14 compliant. Rule #15: every new comment (E2eFillConfig field docstrings, LoanName type alias docstring, EligibilityCalculator option-list comment, CaseRouteSummary display-only lock comment, IS_CREDIT_LINE Flexi DOD intentional-gating comments) cites ADR-0020 or commonPage.json line number as the canonical source + sunset trigger. Rule #16: no new lock tests added (D4 is a rename, not a new code pattern; existing `loanFieldNomenclatureLock.test.ts` already guards the canonical 4-field vocabulary).
- ⚠️ Owner approved 3 overrides to the conservative baseline plan: (1) also rename LOAN_TYPES → LOAN_NAMES constant cluster (originally proposed to leave as `_TYPES` convention), (2) D6 path A (actually align internal `'LAP'` value) instead of path B (comment-only), (3) phase-split into 3 commits instead of single. All 3 overrides applied cleanly without scope creep.
- 📌 **Open for Session 4** (per original spec): D13 lock test `wizardSidebarPageGatesLock.test.ts` (gates landed S207, DoD still owed).
- 📌 **Open for Session 5**: D5, D8, D9 cluster (Start Fresh sunset + mapLoanType.ts deletion + Business Loan - Unsecured investigation + ADR-0022).
- 📌 **Open for Session 6**: D7 bank-loan-management deletion.

**S212 efficiency notes** (per CLAUDE.md §16 Rules #14-16):
- ✅ 0 violations. Net file count: **+1** (lock test `wizardSidebarPageGatesLock.test.ts`, Rule #14 legitimate exception — replaces recurring manual audit work AND spec §5 Session 4 explicitly authorizes this exception). 2 wizardSections files modified (`businessLoan.ts` had a dead subsection removed with §16 Rule #15 sunset comment citing the intentional page removal; `homeLoan.ts` got a `showWhen` added to a subsection with §16 Rule #15 sunset comment citing the D13 audit). Rule #16 compliant: lock test asserts the canonical post-cleanup state (R1 referential integrity + R2 gate pairing), not the transitional pre-fix state.
- ⚠️ Test caught 2 real production-dead UI bugs on first run — exactly the kind of bug class D13 was designed to surface. Worth surfacing the pattern: when a page is removed from `getAllPages()` (Pattern D refactor from S207), the corresponding wizardSection subsection MUST also be removed or repointed; otherwise the sidebar still tries to navigate to it. The lock test now guards this contract.
- 📌 **Open for Session 5** (unchanged): D5, D8, D9 cluster (Start Fresh sunset + mapLoanType.ts deletion + Business Loan - Unsecured investigation + ADR-0022).
- 📌 **Open for Session 6** (unchanged): D7 bank-loan-management deletion.

**S213 efficiency notes** (per CLAUDE.md §16 Rules #14-16):
- ✅ 0 violations. **Net file count: 0 in src/** (2 archives — `mapLoanType.ts` and `firstPage/rules.ts` — moved to `_archive/` per never-delete protocol). **+2 in docs/** (ADR-0024 new, PITFALLS.md #69 appended inline). Rule #14 compliant (no new src files). Rule #15 compliant — every new comment cites ADR-0024 or PITFALLS.md #69 + a sunset trigger. Rule #16 N/A — D9 was archive-not-rename so no new pattern locked; dual-tenure deferral preserved design in PITFALLS rather than ratifying a transitional state with a test.
- ⚠️ **Owner overrode spec D9 framing during investigation.** Spec assumed `'Debt Consolidation' → 'Balance Transfer'` was a mechanical rename. Owner clarified the two values represent operationally distinct customer journeys (BT = 1 bank → 1 bank; DC = many banks → 1 bank). Rename was abandoned; archived dead mapLoanType.ts instead; ADR-0024 D-1 codifies the distinction.
- ⚠️ **Owner steered away from per-lender dual-tenure flag mid-session after deeper investigation.** Three rounds of design were sketched before owner correctly questioned whether shipping any of them was useful absent a lender audit. Pattern learning: when adding a new policy flag, ask "is there a lender audit in scope that will populate this field?" If no, the flag is premature engineering — preserve the design (PITFALLS, code comment, ADR) and ship only documentation.
- 📌 **Open for Session 6** (next): D7 — bank-loan-management permanent deletion.
- 📌 **Open for future dedicated audit session**: per-lender `bt_topup_treatment` engine flag + unsecured DC+Extra payload bridge.

**S215 efficiency notes** (per CLAUDE.md §16 Rules #14-16):
- ✅ 0 violations. **Net file count in src/: -2 production, -1 spec, 0 new tests.** 6 dead production lines removed from 6 src/ files (B); 14 dead test-list lines removed across 3 test files (B + the dup-prefix lock fix); plotEquityPayloadPatchLock.test.ts fully rewritten in place (A — same path, swapped from 5-test existence lock to 4-test absence lock per §16 Rule #16). **Net file count in docs/: +1** (Pitfall #71 appended inline — legitimate per §17 "new pitfall earns inclusion if recurrent + has grep + has code example + actually happened"; all 4 criteria met). Rule #14 compliant (no new src files, no new test files). Rule #15 compliant — every removed dead handler citation in the businessLoan.ts axis comment cites S215 + ADR-0020 + a sunset trigger (re-introduce IF DigitalDSA ever ships a true Business Loan - Secured case-level product). Rule #16 compliant — the rewritten lock explicitly guards canonical state ("no patches present") not transitional state ("patches exist with correct shape"), with header text documenting the §16 Rule #16 rationale.
- ⚠️ **Pattern surfaced**: the form-page-level local `payload` mutation trap (PITFALL #71) is not unique to plot-loan — every loan form's `+page.svelte` has the same `const payloadNew = {...}; let payload = $state.snapshot(payloadNew)` shape. The other 5 loans were NOT audited for similar dead mutations in this session (out of scope). Worth a one-off audit pass during a future Plot & Equity / LEND-1 Phase 2 session when the relevant context is already loaded.
- 📌 **Open spin-offs after archive** (durable tracking — see §11): per-lender bt_topup_treatment flag (PITFALLS #69 + ADR-0024 D-4); Unsecured DC+Extra payload bridge (conditional on the flag); PLOT-BT loanVintageMonths time-bomb (test-infra fix); Smart* calculator `'LAP'` alignment (cosmetic). First two have full design preserved; latter two move to DEVELOPMENT-PLAN backlog at /end.

**S214 efficiency notes** (per CLAUDE.md §16 Rules #14-16):
- ✅ 0 violations. **Net file count in src/: -3** (homeLoanApi.ts archived, 2 offer routes archived — converted to compile stubs per Pitfall #63). **+1 in docs/** (`OFFERS-ARCHITECTURE.md` — legitimate per §17 because it captures the live offers pipeline end-to-end; no equivalent doc existed, and the investigation work to write it was already done as part of confirming the dormant surface had no live overlap). Rule #14 compliant (no new src files; archives move within tree). Rule #15 compliant — every archive header cites zero-importer proof + ADR-0020 + ADR-0024 + the restore-path. Rule #16 compliant — extended `legacyPayloadFieldsAbsent.test.ts` to lock the canonical post-archive state (no live importers of `$lib/services/homeLoanApi`), not a transitional state.
- ⚠️ **Investigation found the surface was 100% dead-code before archival** — exactly the kind of "phantom infrastructure" that accumulates when an external dependency is dropped without the client-side consumers being removed. Pattern worth surfacing: when an integration is retired, hunt the call sites the same day. Otherwise the import statements + sometimes the consumer pages + sometimes the URL constants persist for months/years as "looks-live dead code."
- ⚠️ **Plot-loan `+page.svelte` scaffolding kept in place** because `plotEquityPayloadPatchLock.test.ts` ratifies its current structure. The lock test asserts the Plot & Equity conditional + patches exist in source — BUT those patches target a local `payload` variable that never reaches the engine. The lock is ratifying a transitional state (per CLAUDE.md §16 Rule #16), which means the lock itself is the blocker. Reforming the lock test (so it asserts the patches reach the engine, not just exist in source) is logged to §6 as a Plot & Equity payload-patch reform item. Once that lands, the surrounding plot-loan scaffolding can come out cleanly.
- 📌 **All 15 spec items now resolved or archived.** §3 inventory closed. `last_verified` bumped; spec ready to move to `_archive/` once Plot & Equity reform + the deferred dual-tenure work are also tracked under their own specs / ADRs.

**S209 efficiency notes** (per CLAUDE.md §16 Rules #14-16):
- ✅ 0 violations. Net file count: **0** (16 files modified, 0 added, 0 deleted). Rule #14 compliant (no new files). Rule #15 compliant — the now-stale "// NOTE: the loanVariant prop here is misnamed" comments in ObligationCapture.svelte and applicantRestoreHandler.ts were rewritten (not just left as obsolete back-compat citations) to reflect the post-rename canonical state with explicit S209 attribution. Rule #16 N/A (no new lock tests; this is a rename, not a new code pattern).
- ⚠️ Surfaced a pre-existing data-flow concern in `src/routes/(app)/form/plot-loan/+page.svelte:1526` — the prop assignment now reads `loanScope={combinedAnswers.loanVariant?.toString() ?? ''}`, which visibly shows variant data flowing into a scope-axis prop. For the other 5 loans, the equivalent line is `loanScope={combinedAnswers.loanType?.toString() ?? ''}` (canonical). For Plot, the value flowing is variant (`'Plot Loan Only'` etc.), which means the downstream scope-substring checks (`.includes('Balance Transfer')`, `.includes('Top-up')`, DC implies-obligations check) NEVER fire for Plot. Pre-existing bug — the rename made it visible. Logged as D-incoming-5 below.
- 📌 **Open for next session:** Session 3 cluster (D4 `payloadToFillInstructions.ts` rename + D6 `EligibilityCalculator` alignment + D10 `CaseRouteSummary.svelte:15` display-only verification + D15 `IS_CREDIT_LINE` Flexi DOD gating documentation + the D-incoming-3 time-bomb fix via `vi.setSystemTime` + D-incoming-5 plot-loan obligation data flow). ~120 min batched.


**Owner mandate (2026-05-31):** Eliminate every "kept for backward compat" / canonical-mapping / naming-mismatch item surfaced during the post-rename nomenclature audit. The cleanup target is **zero patchwork** — every backward-compat comment, every translation layer, every prop-name-lies-about-what-it-carries gets resolved, not papered over. Context decays fast; the next maintainer (or future-us in 5 months) shouldn't have to learn institutional folklore to understand a field.

---

## How to use this doc

**Every session that touches anything on this plan starts by re-reading two sections:**

1. **§1 Operating rules** — the standing protocol that prevents new debt from accumulating while we're cleaning old debt
2. **§5 Session N (whichever session you're about to do)** — the specific item list, validation steps, and definition of done

**At the end of every session:**

3. Update §3 inventory (mark items ✅ done with the commit SHA)
4. Add new debt to §6 Incoming debt (anything noticed during the session that isn't already tracked)
5. Add efficiency suggestions to §7 Efficiency-improvement notes (things that could be cleaner, even if outside this cleanup's scope)
6. Update §4 frontmatter `last_verified` date

When all 15 items in §3 are ✅, change frontmatter `status: shipped`, move this file to `docs/specs/_archive/`, and the work is done.

---

## §1 Operating rules (read this every session — non-negotiable)

These rules exist because tech debt accumulates faster than it's cleaned. While we're paying down 15 items, we don't add 3 new ones.

**Most of these rules are now permanent project rules in [`CLAUDE.md`](../../CLAUDE.md) §16** (added 2026-05-31 in response to this cleanup's mandate). The cleanup-specific overlay is short:

### Universal rules — see CLAUDE.md §16

- **§16.14** No new files without justification
- **§16.15** No "kept for back-compat" comments without a dated ADR sunset trigger
- **§16.16** Lock tests guard the canonical state, not the current state

These apply to every session in this project, forever, not just this cleanup. The `/end` protocol now runs an efficiency scan that surfaces violations of all three.

### Cleanup-specific overlays

These two only apply during this cleanup work — they'd create false friction during normal feature work.

#### CR1 — Touch only the cleanup's scope

Each session has a defined scope (§5). Drive-by edits to unrelated files muddy the diff and make reverts harder. If you spot something out of scope, log it in §6 Incoming debt and move on. Resist the urge to "while I'm here." (This is a sharper version of an existing project norm; during normal feature work, scope is wider.)

#### CR2 — Net file count goes down (or stays equal)

After every session, run:

```powershell
git diff --stat main..HEAD | Select-Object -Last 1
```

The session's net file count (created − deleted) should be **≤ 0** unless a CLAUDE.md §16.14 legitimate exception applies. If a session creates 3 files and deletes 0, that's a signal to re-examine whether each new file is justified or whether they should consolidate.

During normal feature work, file count grows — that's expected. But this is debt-reduction work; the count should NOT grow on net.

---

## §2 What "done" looks like

When all 15 items in §3 are ✅, the codebase will have:

- **One canonical vocabulary** for loan-application fields (`loanName` / `loanType` / `facilityType` / `loanVariant`), used end-to-end with zero translation
- **Zero `mapLoanType.ts`-style translation layers** between form and submission
- **Zero "kept for back-compat" comments** without a dated ADR sunset trigger
- **Zero prop names that lie** about the axis they carry
- **Three lock tests** instead of two (sidebar-vs-page showWhen pairing added)
- **One updated ADR** (Pitfall #33 marked obsolete, reference memory marked resolved)
- **One sunset ADR** (ADR-0022 — Start Fresh legacy value sunset, OR a delete commit if migration completes in-session)
- **One decision ADR** (ADR-0023 — bank-loan-management shim sunset OR removal)

Concretely: a developer joining the project in 5 months, reading any of the loan-config / payload-builder / rule-engine code, should not need to read this spec, ADR-0020, or any pitfall doc to understand what a field name means.

---

## §3 Debt inventory (15 items — check off as completed)

> ✅ **All 15 items closed across S207→S214; §6 incoming debt closed in S215.** Spec status: **shipped**. See §11 for spin-offs after archive.

| ID | Item | Type | Session | Status | Commit SHA |
|---|---|---|---|---|---|
| D1 | Prop `loanVariant` carries SCOPE in IncomePageNew, ObligationCapture, applicantRestoreHandler (+ wider chain: IncomeTabContent, IncomeModalContent, Company, wizardState, obligationOptions, incomeTabState CompletionOptions, 6 route +page.svelte files, 4 obligation test files) | Naming | S2 | ✅ | S209 (pending commit) — replace_all `loanVariant` → `loanScope` across 16 files; correct-variant uses in Plot config + journey files preserved |
| D2 | `OBLIGATION_IMPLIED_TYPES` checks scope under variant-named prop | Naming | S2 | ✅ | S209 (pending commit) — renamed to `SCOPES_THAT_IMPLY_OBLIGATIONS` in ObligationCapture.svelte. Set values unchanged (already canonical scope values). Path A locked — no `loanPurpose` axis introduced. |
| D3 | Dead `LoanApplication` interface (`loanTypes.ts:71-91`) + transitively-dead `LimitEntry` (110-125) + `ApplicantDetail` (127-140) — ADR-0020 Batch 1 explicit cleanup target. All three deleted with replacement institutional-memory header pointing at ADR-0020 + S208 deletion record. `LoanEntry` (93-108) preserved — actively used by `src/lib/types/form.ts`. | Dead code | S1 | ✅ | S208 (pending commit) |
| D4 | `payloadToFillInstructions.ts` returns `{loanType: loanName, loanVariant: scope}` — fields lie | Naming | S3 | ✅ | S211 — `a24ab09e` (E2eFillConfig core + cascade + coverageReport LoanTypeCoverage → LoanNameCoverage), `dcaa5a3d` (LoanType type alias + 3 constants + 7 consumers full cascade including TestCase / TestDataFilters / TestCaseQuery / GenerationResult.summary). Full canonical vocabulary alignment in testing-infra. |
| D5 | `Business Loan - Unsecured` selectedLoan key — investigate "Unsecured" suffix meaning | Investigation | S5 | ✅ | S213 (`b688040e`) — axis-documentation comment in `wizardConfigs/businessLoan.ts`. Suffix is load-bearing at OBLIGATION-level (distinguishes from sibling `'Business Loan - Secured'` as a real existing-loan category); case-level handlers for the sibling are vestigial dead code (logged to §6). |
| D6 | `EligibilityCalculator` uses `loanType === 'LAP'` — inconsistent with form canonical | Alignment | S3 | ✅ | S211 (Commit 3 pending) — internal option value `'LAP'` aligned to canonical `'Loan Against Property'` in EligibilityCalculator.svelte + staticEligibilityEngine.ts. Calculator now passes-through-clean to any future rule-engine wiring. SmartEligibilityCalculator + smartEligibility.ts logged as new §6 incoming-debt (separate cluster, same pattern, out of D6 spec scope). |
| D7 | Outbound payload shims for dormant bank-loan-management (`lap/+page.svelte:932`, `plot-loan/+page.svelte:950`) **+ entire bank-loan-management surface (`homeLoanApi.ts`, `HomeLoanApplication` interface, response handlers, related fixtures) per owner decision 2026-05-31: dormant indefinitely, delete permanently** | Deletion | S6 | ✅ | S214 (commit pending) — `homeLoanApi.ts` archived to `_archive/homeLoanApi-S214.ts` (3 submit functions never called; 6 storage helpers consumed only by dead offer routes). 2 offer routes archived to `_archived_topup-loan-offers/` + `_archived_balance-transfer-offers/` (permanently-empty UI; URL constants unused). 2 outbound shims: lap full-cleanup (removed `loanTransaction` $state + `finalApplicants` build + `formattedPayload` PascalCase costume — direct `combinedAnswers` validation now); plot-loan validation-only refactor (surrounding scaffolding blocked from removal by `plotEquityPayloadPatchLock.test.ts` per §16 Rule #16 — Plot & Equity reform logged to §6). Negative lock test extended for `$lib/services/homeLoanApi` import path. ADR-0020 footnote documents the archival; `docs/OFFERS-ARCHITECTURE.md` documents the live offers pipeline for clarity. |
| D8 | `Start Fresh with New Loan` legacy value (formSchema.json q4_loanType + 4 consumers) | Data migration | S5 | ✅ | S213 (`b688040e`) — formSchema.json q4_loanType value renamed to canonical `'New Loan'` (label preserved). MongoDB count verified zero stored cases. Chain cleanup: closureOptions branch removed, firstPage/rules.ts archived, applyAutoLoanRules call removed, fixtureProfiles.test legacy entry dropped. |
| D9 | `mapLoanType.ts` translation layer (`'Debt Consolidation'` → `'Balance Transfer'` at submission) | Architecture | S5 | ✅ partial — archive only, no rename | S213 (`b688040e`) — file archived to `_archive/mapLoanType-S213.ts`. Function was imported in 3 form pages but never called; mapping DC→BT would have been conceptually wrong (ADR-0024 D-1: DC ≠ BT operationally). DC/BT names stay separate forever. |
| D10 | `CaseRouteSummary.svelte:15` display-abbreviation map — verify it's display-only | Verification | S3 | ✅ | S211 (Commit 3 pending) — verified display-only (no other consumers per grep); added scope-locking comment per CLAUDE.md §16 Rule #15 explaining map owns no canonical state. |
| D11 | Pitfall #33 in `docs/PITFALLS.md` still describes pre-rename state — mark obsolete | Docs | S1 | ✅ | pre-S208 (obsolete marker + body rewrite found already present in `PITFALLS.md:914-922` and matching row in `PITFALLS-INDEX.md:59`; S208 verified) |
| D12 | `reference_plot_loan_field_naming.md` memory file still describes pre-rename overload — mark resolved | Docs | S1 | ✅ | S208 (pending commit — RESOLVED header added pointing at ADR-0020 + lock test) |
| D13 | Second-pass wizard sidebar audit — every subsection vs page showWhen pairing across 6 loans | Verification | S4 | ✅ | S212 (commit pending) — lock test `wizardSidebarPageGatesLock.test.ts` written (+7 tests), R1 (referential integrity) + R2 (gate pairing) enforced across all 6 loans. Caught 2 real production-dead UI bugs in first run: (a) Business Loan "Company Financials" chip pointing at non-existent page (removed from sidebar — data flow continues via applicant modal), (b) Home Loan "Location" subsection ungated despite page-level gate (matching `showWhen` added). Gates from S207 (`535e99da`) preserved. |
| D14 | Residual stale comments mentioning legacy names beyond the 6 fixed 2026-05-31 | Docs | S1 | ✅ | `535e99da` (S207 — 4 questionBank docstrings + 3 comments) + S208 (`btLoanDetailsQuestions.ts:518-523` + `edge.ts:1022-1027`). Grep-sweep complete. Remaining hits classified as: (a) outbound shims at `lap/+page.svelte:932` + `plot-loan/+page.svelte:950` — Session 6 territory; (b) intentional institutional memory in lock tests + test docstrings (`loanFieldNomenclatureLock.test.ts`, `closureOptionBtOnlyGate.test.ts`, etc.); (c) pre-rename fixture data in `showWhenTransform.test.ts` — logged to §6 as D-incoming-1. |
| D15 | `IS_CREDIT_LINE` Set in BL/Prof loanRequirement.ts omits Flexi DOD — document the intentional gating | Verification | S3 | ✅ | S211 (Commit 3 pending) — added intentional-gating comments to both businessLoan + professionalLoan loanRequirement.ts citing commonPage.json:178-181 (Flexi DOD 2-year interest-only window) and a sunset trigger per CLAUDE.md §16 Rule #15. |

Effort key: S = ~30min, M = ~60min, L = ~90-120min
Risk key: L = low (type-checker / tests catch regressions), M = medium (touches behavior or stored data)

---

## §4 Sequencing rationale

Six sessions, ordered from low-risk-easy-win to architecture-decision. Reasons for this order:

1. **Doc + dead-code first** — low risk, zero behavior change, builds momentum and confirms the methodology works
2. **Prop renames next** — mechanical, the TypeScript compiler catches every consumer, low risk-of-regression
3. **Standalone consolidations** — files in isolation; no cross-cutting impact
4. **Sidebar audit second pass** — produces a new lock test that prevents future drift in the area we just spent a session on
5. **Data migration + sunset** — riskiest single session; deferred until the methodology is established and we've built confidence
6. **bank-loan-management decision** — needs owner input on the dormancy question; can sit until last

Sessions are **not parallelizable** with each other (same files touched across sessions in some cases), but the work *within* a session can fan out to multiple Agent calls for sub-audits.

---

## §5 Session breakdowns

### Session 1 — Doc closure + dead code

**Goal:** Close the documentation loop on the 2026-05-31 rename. Delete known-dead code. No behavior change.
**Items:** D3, D11, D12, D14
**Estimated effort:** ~60 min

**Files to touch:**
- `src/lib/types/loanTypes.ts` — delete `LoanApplication` interface (lines 71-89), verify no consumers via `pnpm check`
- `docs/PITFALLS.md` — Pitfall #33: append `(verified obsolete 2026-05-31 — rename closed the overload, see ADR-0020)` to the title line
- `C:\Users\OJ\.claude\projects\F--TECH-DigitalDSA-REPOs-DigitalDSA-V3\memory\reference_plot_loan_field_naming.md` — add a "RESOLVED 2026-05-31" header noting the rename completed and the pre-rename description is now historical
- Grep sweep for residual stale comments (`PlotLoanActivity` / `LAPType` / `unSecureLoanType` in `.ts` / `.svelte` files excluding archives + snapshots), patch each

**Validation:**
- `pnpm check` — 0 errors
- `pnpm test:unit -- --run` — all green
- Lock test `loanFieldNomenclatureLock.test.ts` — passes (it doesn't catch comments, but confirms no JSON-Logic regressions snuck in)

**Definition of done:** All four items ticked in §3, frontmatter `last_verified` updated, commit pushed.

---

### Session 2 — Component prop rename (`loanVariant` → `loanScope`)

**Goal:** Every prop that currently carries the SCOPE axis gets renamed so the prop name tells the truth. After this session, no component prop named `loanVariant` carries a scope value.
**Items:** D1, D2
**Estimated effort:** ~90 min

**Files to touch (primary):**
- `src/lib/components/IncomePageNew.svelte` — prop rename + every consumer at lines ~690, ~1793, ~2076
- `src/lib/components/ObligationCapture.svelte` — prop rename + `OBLIGATION_IMPLIED_TYPES` → either `SCOPE_AUTO_IMPLIES_OBLIGATIONS` or merged into existing logic
- `src/lib/utils/applicantRestoreHandler.ts` — variable `journeyVariant` → `journeyScope`
- Any IncomeTabContent / IncomeModalContent subcomponents that receive the prop

**Files to touch (secondary — cross-references):**
- Any test file passing `loanVariant=` as a prop
- Any TypeScript types declaring the prop

**Validation:**
- `pnpm check` — TypeScript catches every consumer; 0 errors
- `pnpm test:unit -- --run` — all green (income + obligation test suites are the highest risk)
- Browser smoke: open one income flow + one obligation flow, confirm behavior unchanged

**Definition of done:** Both items ticked, prop name uniform across all consumers, commit pushed.

**Path A locked in (owner decision 2026-05-31):** `OBLIGATION_IMPLIED_TYPES` is rename-only. The Set values (`'Debt Consolidation'`, `'Debt Consolidation with Extra Funds'`) are already canonical scope values — only the prop name (`loanVariant`) lies about what it carries. Rename the prop to `loanScope`, rename the Set to `SCOPES_THAT_IMPLY_OBLIGATIONS` (or similar), done. No new `loanPurpose` axis. The decision rationale: DC overlaps with purpose semantically but the form treats it as scope and lenders score it as scope; splitting purpose into its own axis would add complexity without unlocking new behavior. Revisit only if a future product requirement (multiple distinct top-up purposes, etc.) creates the need.

---

### Session 3 — Standalone consolidations + test infra

**Goal:** Align self-contained code with canonical vocabulary. Confirm display-only mappings are truly display-only.
**Items:** D4, D6, D10, D15
**Estimated effort:** ~90 min

**Files to touch:**
- `src/lib/server/testing/payloadToFillInstructions.ts:53, 423-430` — return shape changes from `{loanType: loanName, loanVariant: scope}` to `{loanName, loanType: scope}`. Trace every consumer in `src/lib/testing/` and update.
- `src/lib/tools/calculators/eligibility/staticEligibilityEngine.ts:201` + `src/lib/components/tools/calculators/EligibilityCalculator.svelte:86` — align internal option list with canonical `loanName === 'Loan Against Property'` OR document the standalone isolation explicitly so it doesn't surprise future devs
- `src/lib/components/form-wizard/CaseRouteSummary.svelte:15` — verify the abbreviation map is read only in this file for display; add a comment locking that scope
- `src/lib/config/businessLoan/questionBank/loanRequirement.ts:15` + `src/lib/config/professionalLoan/questionBank/loanRequirement.ts:15` — add comment explaining Flexi DOD omission is intentional (`commonPage.json:196-202` gates Flexi DOD to Personal Loan only)

**Validation:**
- `pnpm check`
- `pnpm test:unit -- --run` — payloadToFillInstructions consumers most likely to break
- E2E test journeys using auto-fill should pass

**Definition of done:** Four items ticked, no test failures, commit pushed.

---

### Session 4 — Sidebar audit pass 2 + new lock test

**Goal:** Verify every wizard subsection-vs-page showWhen pairing across all 6 loans. Add a lock test so future drift is caught automatically.
**Items:** D13
**Estimated effort:** ~60 min

**Approach:**
1. For each `wizardSections/{loan}.ts`, enumerate every `pageIds: [...]` entry
2. For each, locate the corresponding page in `{loan}/pages.ts` (or `flows/`) and read its `showWhen`
3. Build a verdict table per loan: ✅ matches / 🔧 needs gate / 🔒 covered by parent section's showWhen
4. Patch any 🔧 entries
5. Write `wizardSidebarPageGatesLock.test.ts` that walks the same structure and asserts: every subsection mapped to a page-with-showWhen either has its own matching showWhen, or its parent section's showWhen covers the same condition

**Validation:**
- `pnpm check`
- `pnpm test:unit -- --run` — new lock test passes
- Browser smoke on Plot Loan, LAP, Home Loan, PL, BL, Prof — at least one BT flow + one non-BT flow each, confirm sidebar matches

**Definition of done:** D13 ticked, new lock test landed, any 🔧 gaps patched, commit pushed.

**Per §1 Rule 1:** The new lock-test file is a legitimate exception — it replaces recurring manual audit work.

---

### Session 5 — Sunset Start Fresh + Business Loan key + mapLoanType.ts deletion

**Goal:** Eliminate the unsecured-loan legacy value chain (`Start Fresh with New Loan` → translation layer → canonical scope) by migrating at the source. After this session, `mapLoanType.ts` is deleted, no translation between form and submission exists.
**Items:** D5, D8, D9
**Estimated effort:** ~120 min — most ambitious session

**🚨 Pre-flight reminder for owner (Part B):**
Before this session starts, owner needs to run a MongoDB count query (see Part B below) so we know whether stored cases use the legacy value. If 0 → clean migration. If >0 → need a migration script. **Claude will surface this reminder at session start so it doesn't get forgotten.**

**Approach:**

**Part A — Investigate Business Loan - Unsecured (~20 min):**
- Read `wizardConfigs/businessLoan.ts:17`, `+page.svelte:672, 714`, and any other selectedLoan consumers
- Determine: is "- Unsecured" historical (planned but never built secured variant) or load-bearing (distinguishes between two valid orthogonal flows)
- If historical: change to `'Business Loan'`, update consumers, document the simplification
- If load-bearing: write a one-line comment explaining the axis and stop here for this item

**Part B — MongoDB scan for legacy value (~20 min):**
- Owner runs: `db.FormSnapshots.find({ "applicationData.loanType": "Start Fresh with New Loan" }).count()` against production
- If 0: clean migration possible — proceed
- If >0: write a migration script that updates stored cases to canonical `'New Loan'` before the form change lands

**Part C — Migrate formSchema.json q4_loanType (~30 min):**
- Replace options `['Start Fresh with New Loan', 'Debt Consolidation with Extra Funds']` with canonical scope values
- Update any showWhen consumers
- Regenerate snapshot fixtures touching this question

**Part D — Delete translation chain (~30 min):**
- Remove `'Start Fresh with New Loan'` branch from `closureOptions.ts`
- Delete `mapLoanType.ts` entirely (form now writes canonical scope directly)
- Update `firstPage/rules.ts` and `how-can-we-help/+page.svelte` consumers
- Update `mapLoanType.ts` callers to read `loanType` directly

**Part E — ADR-0022 (~20 min):**
- Write ADR-0022 documenting the sunset rationale, migration approach, and Pitfall #33-style "what happens if this pattern recurs"

**Validation:**
- `pnpm check`
- `pnpm test:unit -- --run` — snapshot fixtures + unsecured loan tests at highest risk
- Browser smoke: every unsecured loan flow (PL, BL, Prof) × {with obligations, without obligations} = 6 flows
- MongoDB sample case check post-deploy (if Part B found >0 cases)

**Definition of done:** D5, D8, D9 all ticked, ADR-0022 landed, `mapLoanType.ts` deleted (or one-line comment explaining if Part B blocks migration), commit pushed.

**Per §1 Rule 1:** ADR-0022 is a legitimate new-file exception (codifies the sunset, replaces a vague comment).

---

### Session 6 — bank-loan-management permanent deletion

**Goal:** Delete every trace of the bank-loan-management API surface from the codebase. Owner has confirmed (2026-05-31) the project is dormant indefinitely and the entire scope can be removed permanently.
**Items:** D7
**Estimated effort:** ~90-120 min — broader than originally scoped because the deletion extends past the two shims into the whole API surface

**Blast-radius scan (~15 min — runs FIRST before any deletion):**

The two outbound shims (`lap/+page.svelte:932`, `plot-loan/+page.svelte:950`) are entry points, not the whole surface. Likely additional dead code:

- `src/lib/services/homeLoanApi.ts` — `HomeLoanApplication` interface, `submitHomeLoanApplication`, `submitTopupLoanApplication` functions
- `src/lib/types/loanTypes.ts:71-89` — `LoanApplication` PascalCase interface (already targeted by D3 in Session 1; if Session 1 deleted it, confirm here)
- Any response handlers, fixtures, mocks, types that exist only to support these
- Any test fixtures referencing the API contract

Grep approach (run all in parallel at session start):

```powershell
# Direct API surface
Select-String -Path "src\**\*.ts","src\**\*.svelte" -Pattern "bank-loan-management|homeLoanApi|HomeLoanApplication|submitHomeLoan|submitTopupLoan|LoanApplication\b"

# The shim sites themselves
Select-String -Path "src\**\*.svelte" -Pattern "LAPType\s*:|PlotLoanActivity\s*:"

# Any test fixtures or types referencing the API shape
Select-String -Path "src\**\*.ts","src\**\*.json" -Pattern "bank-loan-management|HomeLoanApplication"
```

Build the deletion punch-list from the grep output before deleting anything.

**Deletion (~45 min):**

For each file/section identified, decide:
- **Pure dead code (no consumers)** → delete the file or section entirely
- **Active code with a shim line** → delete the shim line, leave the active code

After each deletion, run `pnpm check` to confirm no live consumer broke.

**Documentation (~15 min):**

- Update ADR-0020 with a 2026-MM-DD footnote: "Bank-loan-management carry-over items D7 deleted in S6 — owner confirmed dormant indefinitely. PascalCase interface, casing-mismatch concerns, and outbound shims all resolved."
- Update this spec's §10 Out of scope to remove the bank-loan-management mention (it's now nothing, not "out of scope")
- No new ADR needed — the decision is already documented in the existing ADR-0020 footnote and the commit message

**Validation:**
- `pnpm check` — 0 errors (catches any consumer I missed)
- `pnpm test:unit -- --run` — full suite green
- Browser smoke: LAP submission + Plot Loan submission complete end-to-end without errors (these were the shim sites)
- Final grep — zero `bank-loan-management` / `homeLoanApi` / `HomeLoanApplication` / `LoanApplication` (PascalCase form) references in active code

**Definition of done:** D7 ticked, all bank-loan-management surface removed, ADR-0020 footnoted, commit pushed.

**Per CLAUDE.md §16 Rule 14:** This session DELETES files; no new files needed.

---

## §6 Incoming debt (log items discovered during cleanup)

When working on the planned sessions, any new debt noticed gets logged here — NOT silently absorbed into the current session's diff. This is how we resist scope creep while still capturing what we see.

Template:
```
- [YYYY-MM-DD, Session N] file:line — short description
  Why: discovered during <session work>
  Risk: HIGH / MEDIUM / LOW
  Suggested handling: add to existing session / new session / archive / pitfall update
```

### Logged entries

- **[2026-06-01, S208] `src/lib/testing/__tests__/showWhenTransform.test.ts:17-19, 84-86`** — test fixture data uses pre-rename shape (`PlotLoanActivity: 'New Loan'` + `loanType: 'Plot Loan Only'` for Plot Loan setup context). Post-rename canonical would be `loanType: 'New Loan'` + `loanVariant: 'Plot Loan Only'`. The fields aren't what's being asserted (the tests check `propertyType === 'Lease Hold'` showWhen transform), so behavior is correct, but the fixture shape is misleading and reads as if pre-rename data still flows through the engine.
  Why: surfaced during D14 grep-sweep; out of D14's "comment" scope per CR1.
  Risk: LOW (cosmetic; tests pass on current engine behavior).
  Suggested handling: fold into Session 3 (test-infra alignment cluster) alongside D4 `payloadToFillInstructions.ts` rename.

- **[2026-06-01, S208] `src/lib/testing/__tests__/plotEquityPayloadPatchLock.test.ts:8-9`** — docstring lists Plot Loan canonical variant values as `'Plot & Equity Loan' / 'Plot & Construction Loan' / 'Construction Loan Only' / 'Plot Loan'`. Canonical fourth value per `commonPage.json:873-891` is `'Plot Loan Only'` (with "Only"). Cosmetic docstring drift; test logic only matches `'Plot & Equity Loan'`, so behavior is correct.
  Why: surfaced during S208 alignment review of the new lock test.
  Risk: LOW (docstring only, no runtime impact).
  Suggested handling: 1-line fix in Session 2 alongside the D1/D2 prop rename (single-line edit, adjacent file area).

- **[2026-06-01, S208] `src/lib/testing/__tests__/factory/schemaFixtureFactory.test.ts` — FM-1 pre-migration snapshot lock — 8 failing tests** — ✅ **RESOLVED in S208.5** via `REGEN_LAP_SNAPSHOTS=1 pnpm test:unit -- --run _regenLapSnapshots` which used the project's existing regenerator (`_regenLapSnapshots.test.ts`, authored 2026-05-26 for the S78 canonical-bank migration; left in suite as no-op skip until env triggered). Updates the 4 `.pre-migration.json` fixtures (PLOT-BT, LAP-BT-TERM, LAP-TOPUP-TERM, LAP-BT-TOPUP) to current canonical engine output. Sanity check on LAP-BT-TERM confirms canonical post-rename shape (`facilityType: 'Term Loan'`, `loanType: 'Balance Transfer Only'`, retired `LAPType`/`unSecureLoanType` absent). All 12,869 tests pass with REGEN unset. Closure: chose option (a) regenerate from the spec's three options — most aligned with `LOAN-FIELD-NOMENCLATURE-EXECUTION-PLAN.md` Batch 8 intent ("Snapshot fixture regeneration").

- **[2026-06-01, S208.5] `src/lib/testing/__tests__/factory/__snapshots__/PLOT-BT.pre-migration.json` — `loanVintageMonths` time-bomb (D-incoming-4)** — Field is computed at test-run time as `(now - loanDisbursementDate) months`. With `loanDisbursementDate: "2016-04"` fixed in the journey, `loanVintageMonths` drifts +1 every month. PLOT-BT regen on 2026-06-01 locked the value at 122; CI will fail again ~2026-07-01 when live engine output computes 123. Same pattern likely affects any other snapshot whose journey includes a fixed `loanDisbursementDate` and locks a derived months/years field.
  Why: surfaced during S208.5 regen — the snapshot diff showed `loanVintageMonths: 122` (received) vs `121` (snapshot) on PLOT-BT specifically.
  Risk: **MEDIUM** — recurring CI failure every ~30 days unless addressed. Forces periodic regen, defeating the lock's purpose.
  Suggested handling: structural fix in test infra — either (a) use a fixed `MOCK_NOW` date when running snapshot tests (most idiomatic; vitest's `vi.setSystemTime` makes this clean), (b) exclude time-derived fields from the snapshot diff comparison (custom matcher), or (c) move the journey's `loanDisbursementDate` to a relative-from-now expression so the derived value stays stable. **Recommend (a)** — single change in the test setup, stable forever. Schedule for Session 3 (test-infra alignment cluster) alongside D4 `payloadToFillInstructions.ts` rename.

- **[2026-06-01, S209→S210] `src/routes/(app)/form/plot-loan/+page.svelte:1526` — Plot Loan passes VARIANT data to scope-axis prop (D-incoming-5)** ✅ **RESOLVED in S210 Phase 4.** Changed from `loanScope={combinedAnswers.loanVariant?.toString() ?? ''}` to `loanScope={combinedAnswers.loanType?.toString() ?? ''}` matching the other 5 loans' canonical pattern. Comment block above the assignment documents the rename + sunset reasoning per CLAUDE.md §16.15.

- **[2026-06-01, S210 Phase 3] `src/lib/testing/scenarios/formPathScenarios.ts` (5 Plot rows) + `formPathAuditor.ts` (5 Plot rows + FormPath interface) — Plot variant misfiled on q4_loanType (NEW)** ✅ **RESOLVED in S210 Phase 3.** Surfaced by parallel audit agent: 5 Plot scenarios (PLOT_ONLY, PLOT_CONSTRUCTION, PLOT_EQUITY, PLOT_CONSTRUCTION_ONLY, PLOT_BT) and 5 corresponding rows in `formPathAuditor.ts`'s ALL_FORM_PATHS had `q4_loanType: 'Plot Loan Only'` / `'Plot & Construction Loan'` / `'Plot & Equity Loan'` / `'Construction Loan Only'` / `'Plot Balance Transfer'` — variant values misfiled on the scope-axis field. Plot BT additionally used a non-canonical hybrid string. Silently bypassed post-rename `loanVariant`-keyed showWhen gates so Plot variant regressions would have gone uncaught by the form-path audit. Fixed: moved variant values to `q4_loanVariant`, Plot BT now uses only `q2_loanType: 'Balance Transfer Only'` (no variant question for BT). FormPath interface updated to make `q4_loanType` optional + add `q4_loanVariant`. Companion test `formPathAuditor.test.ts` updated to use the canonical 3-axis fallback.

- **[2026-06-01, S210 Phase 3] `src/lib/testing/generators/archetypes/archetypeTemplates.ts` (10 Plot entries) + `archetypeHelpers.ts` — Plot variant misfiled on loanType (NEW)** ✅ **RESOLVED in S210 Phase 3.** Surfaced by parallel audit agent: 10 Plot archetypes had `loanType: 'Plot Loan Only'` / etc. — variant values misfiled on the scope-axis field. Propagated into synthetic-payload generation via `archetypeHelpers.ts:206` which copies `archetype.loanType` directly to `LoanTransactionPayload.loanType`. Fixed: added `loanVariant?: string` to `ArchetypeTemplate` interface, moved variant values to it, set `loanType: 'New Loan'` on the 8 new-loan Plot archetypes, set `loanType: 'Balance Transfer Only'` on the 2 BT archetypes, updated `archetypeHelpers.ts` to also copy `loanVariant` to the payload when present.

- **[2026-06-01, S210 Phase 5] `src/lib/testing/__tests__/showWhenTransform.test.ts:14-26, 80-89` (D-incoming-1)** ✅ **RESOLVED in S210 Phase 5.** Pre-rename fixture data (`PlotLoanActivity: 'New Loan'` + `loanType: 'Plot Loan Only'`) rewritten to canonical post-rename shape (`loanType: 'New Loan'` + `loanVariant: 'Plot Loan Only'`). Comments cite ADR-0020 + S210.

- **[2026-06-01, S210 Phase 5] `src/lib/testing/journeys/plotLoan.ts:584-591` — stale comment** ✅ **RESOLVED in S210 Phase 5.** Pre-rename comment about `loanType = 'Plot Balance Transfer'` rewritten to reflect canonical post-rename gate structure (`loanVariant` gates constructionDetails_Plot; Plot BT skips variant question entirely).

- **[2026-06-01, S211] `src/lib/components/tools/calculators/SmartEligibilityCalculator.svelte` + `src/lib/components/tools/calculators/SmartAffordabilityCalculator.svelte` + `src/lib/tools/calculators/smartEligibility.ts` — internal `'LAP'` value (same lying-name pattern as D6)** — Smart* calculator cluster uses `LoanCategory = 'Home Loan' | 'LAP' | 'Plot Loan' | 'Personal Loan' | 'Business Loan'` (smartEligibility.ts:59) and option list `{ label: 'Loan Against Property', value: 'LAP' }` (smartEligibility.ts:444). Same pattern as D6 (which targeted ONLY EligibilityCalculator + staticEligibilityEngine per spec scope). Public-facing calculators with separate value spaces, decoupled from form pipeline.
  Why: discovered during D6 grep sweep — spec scope for D6 was tight (EligibilityCalculator + staticEligibilityEngine only); Smart* cluster is a parallel calculator cluster with its own option list and `LoanCategory` type.
  Risk: LOW (cosmetic alignment; calculator behavior identical regardless of value name).
  Suggested handling: schedule as a Session 5 add-on alongside other standalone-calculator cleanup, OR fold into Session 6 (D7) since both are deletion/alignment work in public-facing public surfaces. Out of scope for S211 to honor CR1 (touch only the cleanup's scope).

- **[2026-06-01, S211] testing-infra `LOAN_TYPES` / `SECURED_LOAN_TYPES` / `UNSECURED_LOAN_TYPES` constants** ✅ **RESOLVED in S211 Commit 2.** Originally proposed as deferred work (constant-naming convention `_TYPES` matches `EMPLOYMENT_TYPES`, `GENDERS`, etc.); owner override approved including the constants in the rename for internal consistency with the type alias rename. Renamed to `LOAN_NAMES` / `SECURED_LOAN_NAMES` / `UNSECURED_LOAN_NAMES` in `schemaExtractor.ts` + 4 consumer files (`combinationGenerator.ts`, `schemaAlignment.test.ts`, `profileGeneration.test.ts`, `test-dashboard/+page.server.ts`, `TestDataManagerTab.svelte`).

- **[2026-06-02, S213] Per-lender BT+Top-up dual-tenure flag (architectural — DEFERRED with design preserved)** — The current engine at `evaluationEngine.ts:865-905` applies dual-tenure FOIR/EMI math universally for `loanType === 'Balance Transfer With Top-up'` cases. Real-world lenders treat BT+Top-up differently (single backend loan vs two backend loans vs case-conditional split). Full fix design is preserved in PITFALLS.md #69 + the KNOWN LIMITATION block at evaluationEngine.ts:854 + ADR-0024 D-4: add `bt_topup_treatment?: 'single_tenure' | 'dual_tenure' | { single_when: object }` to `ParsedLenderRuleDocument`.
  Why: deferred because the flag is only useful once each lender's actual backend treatment is audited.
  Risk: MEDIUM — current engine over-states EMI for single-loan-backend lenders.
  Suggested handling: dedicated audit session with lender-policy team input.

- **[2026-06-02, S213] Unsecured DC+Extra payload bridge to engine BT fields** — For unsecured DC+Extra cases, form ALREADY captures the data (per-obligation `selectedToClose` flag + Loan Requirements page's loanAmount). Missing: a payload-builder bridge that derives transaction-level `principalOutstanding` / `topUpAmount` / tenures from this. Conditional on the per-lender flag above.
  Risk: MEDIUM — accuracy improvement but real customer-eligibility behavior change.
  Suggested handling: schedule jointly with the per-lender dual-tenure audit session.

- **[2026-06-02, S213] `'Business Loan - Secured'` case-level handlers — dead defensive code** ✅ **RESOLVED in S215, 2026-06-02.** 6 production code paths + 3 tests removed: `routes.ts:182` (form route mapping), `caseHelpers.ts:37` (`'BLS'` case ID prefix), `seedPolicyEngine.ts:362` (long-form-input → `'BL_SECURED'` mapping; short-code passthrough on line 372 kept — that one IS live for policy captures), `loanSwitchOrchestrator.svelte.ts:421` (page-index bucket), `evaluating/+page.svelte:30` (animation lender-count), `deriveFixtureName.ts:51` (`'Business Loan (Secured)'` fixture name); `caseHelpers.test.ts`, `deriveFixtureName.test.ts`, `loanVariantPageIndexReset.test.ts` test assertions for the dead mappings dropped. `wizardConfigs/businessLoan.ts` axis-documentation comment updated to reflect post-cleanup state + sunset trigger for future re-introduction. String remains LIVE on two other axes: obligation-type taxonomy (obligationOptions / applicantOptions / RM-portfolio filter) and policy taxonomy (PMS `BL_SECURED` short-code in policyEngine.ts / policyCapture.ts / policyCaptureTransformer.ts + `seedPolicyEngine.ts:372` short-code passthrough).

- **[2026-06-02, S214] Plot & Equity payload-patch reform** ✅ **RESOLVED in S215, 2026-06-02 (path (c) — confirmed patches no longer needed; removed entirely; lock reformed to canonical-absence).** Investigation confirmed the patches mutated a local `payload` variable that `confirmAndSubmit({ formStateJson: formState.toJSON(), ... })` never read — they were a no-op for the engine since the day they were written. Patch #1 (`purchaseType === 'Resale'` → `differentATSandPV='Yes'`) was additionally dead from inception (case mismatch — form values are lowercase `'resale'`, comparison checked capitalized `'Resale'`). Patch #2 (`loanVariant === 'Plot & Equity Loan'` → `purchaseType='Direct Sale'` + `differentATSandPV='Yes'`) fired correctly post-S207 rename but never reached engine. Plot & Equity Phases 2-4 (LEND-1) unshipped, so net production impact: zero either way. **Changes:** (i) both patch blocks removed from `plot-loan/+page.svelte:1015-1028` and replaced with explanatory comment; (ii) `plotEquityPayloadPatchLock.test.ts` fully rewritten as a canonical-absence lock per §16 Rule #16 (asserts neither patch can be re-introduced; keeps independent `confirmAndSubmit` shape check); (iii) **new Pitfall #71** in PITFALLS.md documents the form-page-level payload-mutation trap + the 3 canonical layers for legitimate overrides (form-state effect / builder / enricher); (iv) Plot & Equity's structural need for purchaseType + differentATSandPV semantics deferred to LEND-1 Phase 2 (engine-level redesign — the right layer for it). The surrounding `payloadNew`/`payload` scaffolding cleanup in plot-loan/+page.svelte (~150 lines) is now UNBLOCKED; folded into LEND-1 Phase 2 payload redesign rather than done as a standalone pass.

---

## §7 Efficiency-improvement notes (read-only, not in scope to fix here)

Per §1 Rule 5, every session ends with a 5-minute efficiency scan. Anything noticed gets logged here. We don't fix during this cleanup, but we have the list for the next refactor.

Examples of what to log (not real items yet):
- "X file has 4 helpers that all manipulate the same shape — could be one"
- "Y component receives 9 props, 3 of which are always derived from a single source"
- "Z test file has 15 identical-shape tests that could be one `it.each`"

(Empty until Session 1 starts.)

---

## §8 Validation hooks

Standard validation commands per session:

```powershell
# Type check + svelte-check
pnpm check

# Unit test suite
pnpm test:unit -- --run

# Single test file (when iterating)
pnpm test:unit -- --run path\to\specific.test.ts

# Net file count check (per §1 Rule 6)
git diff --stat main..HEAD | Select-Object -Last 1

# Grep sweep for residual legacy names (run after every session)
Select-String -Path "src\**\*.ts","src\**\*.svelte","src\**\*.svelte.ts" `
  -Pattern "PlotLoanActivity|LAPType|unSecureLoanType" `
  | Where-Object { $_.Path -notmatch "_archive|pre-migration|memory" }

# Browser smoke (manual)
pnpm dev
# Navigate to the affected loan flows
```

---

## §9 References

- ADR-0020 — Loan field nomenclature (the parent rename that this cleanup follows up on)
- `docs/specs/LOAN-FIELD-NOMENCLATURE-EXECUTION-PLAN.md` — companion execution plan for the parent rename
- `docs/PITFALLS.md` Pitfall #33 — will be marked obsolete in Session 1
- `src/lib/testing/__tests__/loanFieldNomenclatureLock.test.ts` — Lock test from the parent rename
- `src/lib/testing/__tests__/dualTenureBTTopup.test.ts` — Lock test for the engine BT+Top-up gate (updated 2026-05-31 as part of audit)
- This session's audit findings — see commit history around 2026-05-31 wizard sidebar + cross-cutting nomenclature fixes
- `CLAUDE.md` §17 — Doc hygiene meta-rules (frontmatter convention, when to add/remove/update pitfalls, soft size limits)

---

## §10 Out of scope (explicitly NOT in this cleanup)

To prevent scope creep:

- **Renaming `loanType` to `loanScope` everywhere** — `loanType` already means scope correctly in 5 of 6 loans and ADR-0020 §Alternatives Considered #3 explicitly rejected this rename as too high blast radius for too little gain
- **Touching obligation-context `loanType`** (`currentLoanType`, `LOAN_TYPE_OPTIONS`, etc.) — different concept, different option set, unrelated to the rename
- **Touching FormSession.loanType / QA scenario loanType** — different concept (means `loanName` in those contexts), separate conversation
- **Anything in `_archive/` or `_archived/`** — historical by definition

If any of these tempt you mid-session, log in §6 and move on.

*(Previously listed: "migrating the bank-loan-management API itself" — owner confirmed 2026-05-31 the project is dormant indefinitely and the API surface is being deleted in Session 6. No longer out of scope; it's now nothing.)*

---

## §11 Spin-offs after archive (S215 closure)

This spec is archived as **shipped** in S215 (2026-06-02). All 15 §3 items resolved; all §6 incoming-debt items either resolved in S215 or moved to durable tracking elsewhere. Open work that originated here continues to live in the locations below — read them, not this spec, when picking up these items.

### Already durably tracked (no further spin-off needed)

| Item | Origin | Lives in |
|---|---|---|
| Per-lender `bt_topup_treatment` engine flag — universal dual-tenure math is wrong for single-loan-backend lenders + conditional lenders | §6 S213 | [PITFALLS.md #69](../PITFALLS.md) + [ADR-0024](../adr/0024-loan-vocabulary-and-dual-tenure-deferral.md) D-4 + KNOWN LIMITATION block at `src/lib/ruleEngine/evaluationEngine.ts:854` |
| Unsecured DC+Extra payload bridge to engine BT fields — form already captures the data, missing the payload-builder translation | §6 S213 | [PITFALLS.md #69](../PITFALLS.md) (conditional on the flag above) |
| Form-page-level local-payload mutations don't reach the engine — the trap pattern + the 3 RIGHT layers (form-state effect / builder / enricher) | §6 S214 → S215 | [PITFALLS.md #71](../PITFALLS.md) (new in S215) — covers plot-loan as the resolved example; other 5 loan forms not yet audited |
| Plot Loan enricher gap — `direct_from_developer` and plain `resale` fall through `payloadEnricher.ts:976-998` | S215 investigation | [PITFALLS.md #71](../PITFALLS.md) Detection section + LEND-1 Phase 2 follow-up |

### Needs DEVELOPMENT-PLAN backlog entry (added at /end of S215)

| Item | Origin | What it needs |
|---|---|---|
| PLOT-BT snapshot `loanVintageMonths` time-bomb — derived months field drifts +1 every ~30 days | §6 S208.5 (D-incoming-4) | Test-infra fix: `vi.setSystemTime` in snapshot tests (single change, stable forever). Add to backlog. |
| Smart\* calculator `'LAP'` value cluster — same lying-name pattern as D6 but in `SmartEligibilityCalculator.svelte` + `SmartAffordabilityCalculator.svelte` + `smartEligibility.ts` | §6 S211 | Public-facing calculators, separate value space from form pipeline. Cosmetic alignment. Add to backlog. |

### Folded into LEND-1 Phase 2 (Plot & Equity engine + offer card)

- Surrounding `payloadNew` + `payload` scaffolding cleanup in `plot-loan/+page.svelte` (~150 lines) — unblocked by S215 lock reform; the right cleanup window is the LEND-1 payload redesign session, not a standalone pass.
- Plot & Equity's structural semantics for `purchaseType` + `differentATSandPV` — the right layer is the LEND-1 Phase 2 engine + builder + enricher redesign.
- Audit other 5 loan forms for sibling form-page-level payload mutations (PITFALL #71 class) while the relevant context is loaded.

### Where to read first when picking up any of these

1. This spec (in `_archive/`) for full S207→S215 narrative + §6 detail
2. PITFALLS.md #69 and #71 for the trap patterns
3. ADR-0020 (nomenclature) + ADR-0024 (dual-tenure deferral)
4. SESSION-HANDOFF.md for current backlog priority
