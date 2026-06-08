# Loan Field Nomenclature — Execution Plan

**Status:** Awaiting owner approval (2026-05-31). Companion to [`LOAN-FIELD-NOMENCLATURE.md`](LOAN-FIELD-NOMENCLATURE.md) and [`ADR-0020`](../adr/0020-loan-field-nomenclature.md).
**Approach:** Single-PR hard cutover. Pre-launch context — disposable test data, no live customers, no need for the original three-phase soak plan.
**Execution location:** worktree branch `claude/loan-field-rename`. Merged to `main` after worktree validation.

This doc is the mechanical file-by-file change list. Approval here gates worktree creation. After approval, the worktree work happens in batches, each committed independently so a partial revert is easy.

---

## 1. Rename truth table

| Old field | New field | Loan(s) affected | Values |
|---|---|---|---|
| `PlotLoanActivity` | `loanType` | Plot Loan | `New Loan` / `Balance Transfer Only` |
| `loanType` (Plot-context only) | `loanVariant` | Plot Loan | `Plot Loan Only` / `Plot & Construction Loan` / `Plot & Equity Loan` / `Construction Loan Only` |
| `LAPType` | `facilityType` | LAP | `LAP` (= `Term Loan` after rename) / `Drop-line OverDraft (DOD)` |
| `unSecureLoanType` | `facilityType` | Personal, Business, Professional | `Term Loan` / `Overdraft (OD)` / `Drop-line OverDraft (DOD)` / `Flexi Drop-line OverDraft (Flexi DOD)` / `Cash Credit (CC)` |
| `loanType` (Scope axis) | unchanged | Home, LAP, Personal, Business, Professional | `New Loan` / `Balance Transfer Only` / `Balance Transfer With Top-up` / `Top-up Only` / `Debt Consolidation` / `Debt Consolidation with Extra Funds` |
| `loanName` | unchanged | All 6 | `Home Loan` / `Loan Against Property` / `Plot Loan` / `Personal Loan` / `Business Loan` / `Professional Loan` |

**Special: LAP's `LAPType` value `"LAP"`** — for Home/Plot/LAP-Term these were lumped under `LAPType: "LAP"` for "this is a term loan facility against property." Under the rename this becomes `facilityType: "Term Loan"` consistent with how PL/BL/Prof express the same idea. The `"Drop-line OverDraft (DOD)"` value stays.

**Out of scope — `loanType` in unrelated contexts:**
- Obligation entries (`currentLoanType` in `obligation.json`, `LOAN_TYPE_OPTIONS`, `getLoanTypeIcon`)
- `FormSession.loanType` (= loanName)
- QA scenario `loanType` (= loanName)
- `tableLoanEntries[].loanType` / `tableLimitEntries[].loanType` in offer payload
- `existingLoanType` (current loan field)
- `applicantOptions/loanTypes.ts` exports (obligation-related)

These ARE NOT renamed. They use the word "loanType" for a different concept and changing them is a separate conversation.

---

## 2. Pre-execution checklist (operator actions)

Before the worktree is created:

- [ ] **Confirm test-data wipe scope.** Run `scripts/wipe-pre-rename-cases.mjs` (to be authored in the PR) which drops:
  - `FormSnapshots` (all, except where `meta.is_sample === true`)
  - `Cases` (all, except where `is_sample === true`)
  - `LenderResultsSnapshots` (all matching the dropped cases)
  - Browser sessionStorage / localStorage on every test browser (instructions in the runbook)
- [ ] **Run live MongoDB rule-doc check.** `scripts/check-rule-docs-field-refs.mjs` queries `LenderRuleArtifacts.find({status:'active'})` and reports any `json_logic` blob references to `PlotLoanActivity` / `LAPType` / `unSecureLoanType`. Expected: zero. If non-zero, those rule docs need rewriting (PMS team).
- [ ] **All 4 demo `is_sample: true` cases** — confirm they'll survive the wipe. They drive the new-DSA onboarding experience.

---

## 3. Worktree layout

- Branch name: `claude/loan-field-rename`
- Worktree path: `.claude/worktrees/loan-field-rename`
- Each batch (§4 below) lands as one commit on the worktree branch
- Final integration to `main`: cherry-pick or rebase (linear-history rule — no merge commits)
- Worktree removed after merge per standing rule

---

## 4. Execution sequence — commit-by-commit

Each batch is one commit. Each must leave the worktree type-clean and test-green.

### Batch 1 — Types (1 commit)

Renames type definitions and shared enums.

| File | Change |
|---|---|
| [src/lib/types/loanTypes.ts](../../src/lib/types/loanTypes.ts) | Add `facilityType` / `loanVariant` to internal types. **Don't touch** `LoanApplication` PascalCase interface — that's dead code (bank-loan-management dormant). Will be cleaned up post-rename. |
| [src/lib/config/homeLoan/types.ts](../../src/lib/config/homeLoan/types.ts) | `LoanType` type — no change (Scope axis stays). |
| [src/lib/types/policyEngine.ts](../../src/lib/types/policyEngine.ts) | **Delete** `PRODUCT_TYPE_MAP` (confirmed dead). Audit `PRODUCT_TYPE_LABELS` — if dead too, delete. |

### Batch 2 — Form schema writes — `commonPage.json` (1 commit)

The biggest single file. ~25 sites touched.

| File | Sites |
|---|---|
| [src/lib/config/commonPage.json](../../src/lib/config/commonPage.json) | Lines 82-83 (`LAPType` question → `facilityType`); 114-116 (`q2_PlotLoanActivity` → `q2_loanType` — Plot scope); 147-149 (`q2_unSecureLoanType` → `q2_facilityType`); 14 `var: "unSecureLoanType"` → `var: "facilityType"`; 5 `var: "LAPType"` → `var: "facilityType"`; 5 `var: "PlotLoanActivity"` → `var: "loanType"` (Plot scope). Question IDs also rename: `q2_LAPType` → `q2_facilityType`, `q2_PlotLoanActivity` → (already `q2_loanType` exists for other loans? — verify and disambiguate during execution). |

**Decision needed:** the question ID for Plot's scope picker — keep `q2_PlotLoanActivity` or rename to `q2_loanType_plot` to avoid colliding with other loans' Scope questions? Likely keep distinct IDs since each loan family has its own picker page. Confirm during execution.

### Batch 3 — Form schema writes — per-loan question banks (1 commit)

| File | Change |
|---|---|
| [src/lib/config/plotLoan/questionBank/loanRequirement.ts](../../src/lib/config/plotLoan/questionBank/loanRequirement.ts) | 9 `var: 'PlotLoanActivity'` → `var: 'loanType'` |
| [src/lib/config/plotLoan/questionBank/propertyLegal_Plot.ts](../../src/lib/config/plotLoan/questionBank/propertyLegal_Plot.ts) | 1 `var: 'PlotLoanActivity'` → `var: 'loanType'` |
| [src/lib/config/plotLoan/questionBank/constructionDetails_Plot.ts](../../src/lib/config/plotLoan/questionBank/constructionDetails_Plot.ts) | 2 `var: 'PlotLoanActivity'` → `var: 'loanType'` |
| [src/lib/config/plotLoan/pages.ts](../../src/lib/config/plotLoan/pages.ts) | 1 `var: 'PlotLoanActivity'` → `var: 'loanType'`. Plus: rewrite any `var: 'loanType'` showWhens that mean "Plot variant" → `var: 'loanVariant'`. |
| [src/lib/config/lapLoan/questionBank/loanRequirement.ts](../../src/lib/config/lapLoan/questionBank/loanRequirement.ts) | 1 `var: 'LAPType'` → `var: 'facilityType'` |
| [src/lib/config/lapLoan/pages.ts](../../src/lib/config/lapLoan/pages.ts) | 1 `var: 'LAPType'` → `var: 'facilityType'` |
| [src/lib/config/personalLoan/questionBank/loanRequirement.ts](../../src/lib/config/personalLoan/questionBank/loanRequirement.ts) | 2 `var: 'unSecureLoanType'` → `var: 'facilityType'` |
| [src/lib/config/businessLoan/questionBank/loanRequirement.ts](../../src/lib/config/businessLoan/questionBank/loanRequirement.ts) | 2 `var: 'unSecureLoanType'` → `var: 'facilityType'` |
| [src/lib/config/professionalLoan/questionBank/loanRequirement.ts](../../src/lib/config/professionalLoan/questionBank/loanRequirement.ts) | 1 `var: 'unSecureLoanType'` → `var: 'facilityType'` |

### Batch 4 — Wizard configs (1 commit)

| File | Change |
|---|---|
| [src/lib/config/wizardConfigs/plotLoan.ts](../../src/lib/config/wizardConfigs/plotLoan.ts) | `LAPType` → `facilityType` in derived answers |
| [src/lib/config/wizardConfigs/lapLoan.ts](../../src/lib/config/wizardConfigs/lapLoan.ts) | Same |
| [src/lib/config/wizardConfigs/homeLoan.ts](../../src/lib/config/wizardConfigs/homeLoan.ts) | Same |

### Batch 5 — Form route components (1 commit)

| File | Change |
|---|---|
| [src/routes/(app)/form/plot-loan/+page.svelte](../../src/routes/(app)/form/plot-loan/+page.svelte) | Line 950: `PlotLoanActivity:` → `loanType:` in pre-page-fill; lines 1517-1526: rewrite the Plot-variant detection block (`combinedAnswers.PlotLoanActivity` → `combinedAnswers.loanType`); audit all `loanType` reads — some are scope (stay), some are variant (flip to `loanVariant`) |
| [src/routes/(app)/form/lap/+page.svelte](../../src/routes/(app)/form/lap/+page.svelte) | Line 932 `LAPType:` → `facilityType:`; line 186 comment update |
| [src/routes/(app)/form/home-loan/+page.svelte](../../src/routes/(app)/form/home-loan/+page.svelte) | Line 288 comment update (still references `LAPType` in a doc string) |
| [src/routes/(app)/form/unsecure-loan/personal-loan/+page.svelte](../../src/routes/(app)/form/unsecure-loan/personal-loan/+page.svelte) | Line 289 `unSecureLoanType:` → `facilityType:` |
| [src/routes/(app)/form/unsecure-loan/business-loan/+page.svelte](../../src/routes/(app)/form/unsecure-loan/business-loan/+page.svelte) | Line 314 same |
| [src/routes/(app)/form/unsecure-loan/professional-loan/+page.svelte](../../src/routes/(app)/form/unsecure-loan/professional-loan/+page.svelte) | Line 338 same |
| [src/routes/(app)/form/how-can-we-help/+page.svelte](../../src/routes/(app)/form/how-can-we-help/+page.svelte) | Line 111: `VARIANT_SHAPING_KEYS = new Set(['loanType', 'PlotLoanActivity', 'unSecureLoanType'])` → `new Set(['loanType', 'facilityType', 'loanVariant'])`. **Update Pitfall #41 grep alongside.** |
| [src/routes/(app)/(offers)/plot-offers/+page.svelte](../../src/routes/(app)/(offers)/plot-offers/+page.svelte) | Lines 501, 520: `PlotLoanActivity === 'Balance Transfer Only'` → `loanType === 'Balance Transfer Only'` |

### Batch 6 — Payload + engine reads (1 commit)

The mechanical heart of the rename. **These are the live submit-path reads.**

| File | Change |
|---|---|
| [src/lib/utils/payloadBuilder/loanTransaction.ts](../../src/lib/utils/payloadBuilder/loanTransaction.ts) | Line 23: drop legacy PascalCase `LoanType` fallback (dead code). Line 30: `unSecureLoanType` → `facilityType`. Line 36: `LAPType` → `facilityType`. Lines 71-74: rewrite Plot BT detection to use `loanType` for scope (was reading `plotActivity = PlotLoanActivity`). Multi-site: every `String(loanAnswers.loanType ?? '')` that's checking against `'Plot Loan Only'` / `'Plot & Construction Loan'` / `'Construction Loan Only'` / `'Plot & Equity Loan'` → flip to `loanVariant`. ~5 sites (113, 125, 179, 185, 187). Add explicit JSDoc noting which axis each `lt` local variable refers to. |
| [src/lib/utils/combinedAnswersMemo.ts](../../src/lib/utils/combinedAnswersMemo.ts) | Lines 272, 282: secured-loan builder injects `facilityType` (was `LAPType`). Lines 289, 314: unsecured-loan builder injects `facilityType` (was `unSecureLoanType`). Plot scope/variant also propagated. |
| [src/lib/utils/casePayloadBuilder.ts](../../src/lib/utils/casePayloadBuilder.ts) | Line 357 `plotActivity = answers.PlotLoanActivity` → `plotScope = answers.loanType` (Plot scope); audit any sibling Plot-variant reads → `loanVariant` |
| [src/lib/utils/loanSwitchOrchestrator.svelte.ts](../../src/lib/utils/loanSwitchOrchestrator.svelte.ts) | Line 396 docstring update. The `VARIANT_SHAPING_KEYS` referenced in this file is in `how-can-we-help` (already in Batch 5). |
| [src/lib/utils/formWizardEngine.ts](../../src/lib/utils/formWizardEngine.ts) | Lines 37, 98 docstring updates referencing `LAPType` / `unSecureLoanType` |
| [src/lib/ruleEngine/payloadEnricher.ts](../../src/lib/ruleEngine/payloadEnricher.ts) | Line 666 reads `facilityType` already (no change). Audit if any branches read the legacy names — flip if so. |
| [src/lib/ruleEngine/systemConfig.ts](../../src/lib/ruleEngine/systemConfig.ts) | Line 103 docstring update |
| [src/lib/ruleEngine/evaluationEngine.ts](../../src/lib/ruleEngine/evaluationEngine.ts) | Line 994 comment cleanup (`no PlotLoanActivity check needed` becomes stale) |

### Batch 7 — Test journeys + scenarios (1 commit)

| File | Change |
|---|---|
| [src/lib/testing/journeys/plotLoan.ts](../../src/lib/testing/journeys/plotLoan.ts) | All `PlotLoanActivity: 'New Loan'` → `loanType: 'New Loan'` (5 sites); `PlotLoanActivity: 'Balance Transfer Only'` → `loanType: 'Balance Transfer Only'` (1 site); add `loanVariant` entries where Plot variant currently lives in `loanType`. |
| [src/lib/testing/journeys/lapLoan.ts](../../src/lib/testing/journeys/lapLoan.ts) | All `LAPType: 'LAP'` → `facilityType: 'Term Loan'` (4 sites); `LAPType: 'Drop-line OverDraft (DOD)'` → `facilityType: 'Drop-line OverDraft (DOD)'` (1 site) |
| [src/lib/testing/journeys/edge.ts](../../src/lib/testing/journeys/edge.ts) | `LAPType` → `facilityType` (3 sites); comment cleanup at lines 1022-1023 |
| [src/lib/testing/journeys/personalLoan.ts](../../src/lib/testing/journeys/personalLoan.ts) | Comment update; audit if any sites set `unSecureLoanType` |
| [src/lib/testing/scenarios/formPathScenarios.ts](../../src/lib/testing/scenarios/formPathScenarios.ts) | `q2_PlotLoanActivity` field on `FormPathScenario` type + 5 scenario instances → `q2_loanType_plot` (or whatever ID Batch 2 settles on) |
| [src/lib/testing/scenarios/formPathAuditor.ts](../../src/lib/testing/scenarios/formPathAuditor.ts) | Same — 5 sites |
| [src/lib/testing/factory/schemaFixtureFactory.ts](../../src/lib/testing/factory/schemaFixtureFactory.ts) | Lines 91, 101, 102, 103: PlotLoanActivity / LAPType / unSecureLoanType handling → new names |
| [src/lib/testing/factory/journeyTypes.ts](../../src/lib/testing/factory/journeyTypes.ts) | Line 113 docstring update |
| [src/lib/testing/factory/journeyPlayer.ts](../../src/lib/testing/factory/journeyPlayer.ts) | Line 207 docstring update |
| [src/lib/testing/e2e/formHelpers.ts](../../src/lib/testing/e2e/formHelpers.ts) | Lines 362, 383, 428, 431: `q2_PlotLoanActivity` selector + type → new ID |
| [src/lib/testing/e2e/selectorRegistry.ts](../../src/lib/testing/e2e/selectorRegistry.ts) | Line 83: same selector update |

### Batch 8 — Snapshot fixture regeneration (1 commit)

The snapshot files are large JSON. They need regeneration after Batches 1-7 land in the worktree so the new payload shape gets baked in.

| Fixture | Why regenerated |
|---|---|
| `PLOT-CONSTRUCTION.pre-migration.json` | Plot variant now in `loanVariant`, scope now in `loanType` |
| `PLOT-CONSTRUCTION-ONLY.pre-migration.json` | Same |
| `PLOT-BT.pre-migration.json` | Scope (`PlotLoanActivity: 'Balance Transfer Only'`) now `loanType: 'Balance Transfer Only'` |
| `LAP-DOD-NEW.pre-migration.json` | `LAPType` → `facilityType` |
| `LAP-BT-TERM.pre-migration.json` | Same |
| `LAP-BT-TOPUP.pre-migration.json` | Same |
| `LAP-TOPUP-TERM.pre-migration.json` | Same |
| `EDGE-GOVT-SAL.pre-migration.json` | `LAPType` → `facilityType` (if applicable) |
| `EDGE-BT-CREDIT-LINES.pre-migration.json` | Plot field shift if applicable |
| `HL-BT-TOPUP.pre-migration.json` | Audit for `PlotLoanActivity` (the snapshot factory may have stamped it accidentally) |

Snapshot regen approach: run the existing `_regenBugAFixSnapshots.test.ts` / `_regenLapSnapshots.test.ts` patterns after the rename is in place. **Diff every regenerated snapshot manually** before committing — the goal is exactly to confirm only the renamed keys changed, no value drift.

### Batch 9 — Unit tests (1 commit)

| File | Change |
|---|---|
| [src/lib/testing/__tests__/combinedAnswersMemo.test.ts](../../src/lib/testing/__tests__/combinedAnswersMemo.test.ts) | Lines 203-211 secured-loan test: rename `LAPType` → `facilityType`. Lines 253-258 unsecured-loan test: rename `unSecureLoanType` → `facilityType`. |
| [src/lib/testing/__tests__/btTopupPayloadSizing.test.ts](../../src/lib/testing/__tests__/btTopupPayloadSizing.test.ts) | Lines 19, 73-80 Plot BT test: rename `PlotLoanActivity: 'Balance Transfer Only'` → `loanType: 'Balance Transfer Only'`. |
| [src/lib/testing/__tests__/closureOptionBtOnlyGate.test.ts](../../src/lib/testing/__tests__/closureOptionBtOnlyGate.test.ts) | Line 92 describe-block name correction (`loanVariant` here was already a misnomer for Scope; clarify); no test logic change needed |
| [src/lib/testing/__tests__/loanVariantPageIndexReset.test.ts](../../src/lib/testing/__tests__/loanVariantPageIndexReset.test.ts) | Lines 7-8 docstring update |
| [src/lib/testing/__tests__/payloadCompleteness.test.ts](../../src/lib/testing/__tests__/payloadCompleteness.test.ts) | Lines 188, 202, 216, 650 `unSecureLoanType` → `facilityType` (4 sites) |
| [src/lib/testing/__tests__/showWhenTransform.test.ts](../../src/lib/testing/__tests__/showWhenTransform.test.ts) | Lines 18, 85 `PlotLoanActivity` → `loanType` |
| [src/lib/testing/__tests__/factory/_regenBugAFixSnapshots.test.ts](../../src/lib/testing/__tests__/factory/_regenBugAFixSnapshots.test.ts) | Lines 32, 77 docstring/comment updates |
| **New file** — `src/lib/testing/__tests__/loanFieldNomenclatureLock.test.ts` | Negative-grep regression-lock: scan `src/` for `PlotLoanActivity` / `LAPType` / `unSecureLoanType` references — ANY hit in `src/` (excluding `_archive/`) fails the test. Per Pitfall #66, regex uses usage-shape patterns, not bare identifiers. |

### Batch 10 — Pitfalls + CLAUDE.md (1 commit)

| File | Change |
|---|---|
| [docs/PITFALLS.md](../PITFALLS.md) | **Pitfall #33** (Plot Loan's `loanType` is the SCOPE not VARIANT) — mark `(verified obsolete 2026-05-31 — field nomenclature rename closed the overload)`. **Pitfall #41** (loan variant page index reset) — update `VARIANT_SHAPING_KEYS` references from old to new names. |
| [CLAUDE.md](../../CLAUDE.md) | **§3 Index** — annotate Pitfall #33 obsolete date in the table. **§4 Pre-Flight Greps** — flip Pitfall #33 grep + Pitfall #41 grep to new field names. **§16 Hard Rule #11** — replace `migrateApplicantKeys.ts` pointer (file is archived) with link to actual current convention. |

### Batch 11 — Spec, ADR, integration docs (1 commit)

| File | Change |
|---|---|
| [docs/specs/LOAN-FIELD-NOMENCLATURE.md](LOAN-FIELD-NOMENCLATURE.md) | Append **"2026-05-31 Amendment — Hard Cutover"** section: pre-launch context obviates three-phase plan; bank-loan-management dead in DigitalDSA-V3 (investigation pointer); single-PR execution; companion execution plan (this doc) referenced. Optionally mark §6 Phase A/B/C, §7, §10 as **historical** rather than deleting. |
| [docs/adr/0020-loan-field-nomenclature.md](../adr/0020-loan-field-nomenclature.md) | Append **"2026-05-31 Decision Update"** section: scope reduced from two-repo to one-repo (bank-loan-management dead); three-phase plan replaced by hard cutover; doesn't change the four-field decision itself (still accepted). |
| [docs/LOAN-ASSESSMENT-API-INTEGRATION.md](../LOAN-ASSESSMENT-API-INTEGRATION.md) | Correct the stale claim "all 6 loans route through bank-loan-management as of 2026-05-29" (lines 89-99). Add accurate description: live submit goes through `/api/evaluate-and-persist` → in-house rule engine. Note bank-loan-management module remains in repo as dead code, archival follow-up tracked separately. |
| [docs/PAYLOAD_DOCUMENTATION.md](../PAYLOAD_DOCUMENTATION.md) | Update `loanType` semantics section to reflect Scope-everywhere model. Add `loanVariant` + `facilityType` documentation. |
| [docs/specs/PLOT-EQUITY-LOAN-DESIGN.md](PLOT-EQUITY-LOAN-DESIGN.md) | Mark Phase 1 ✅ complete (absorbed by this rename). |
| `memory/reference_plot_loan_field_naming.md` (outside repo) | Mark as historical post-rename. Done manually outside this PR. |

### Batch 12 — Operator scripts + runbook (1 commit)

| File | Purpose |
|---|---|
| `scripts/wipe-pre-rename-cases.mjs` | Node script. Connects to Atlas via `MONGODB_URI`. Drops `FormSnapshots` / `Cases` / `LenderResultsSnapshots` rows except where `is_sample === true`. Prints counts before deletion + dry-run mode. Idempotent. |
| `scripts/check-rule-docs-field-refs.mjs` | Node script. Queries `LenderRuleArtifacts.find({status:'active'})`. Greps each `json_logic` blob for `PlotLoanActivity` / `LAPType` / `unSecureLoanType`. Prints lender ID + product + path on hit. Expected output: empty. |
| `docs/runbooks/LOAN-FIELD-RENAME-RUNBOOK.md` | Operator playbook: (1) run check-rule-docs script; (2) review worktree PR; (3) run wipe script (dry-run first); (4) browser-clear instructions for team testers; (5) merge worktree; (6) browser smoke each loan family. |

---

## 5. Validation checklist (before worktree → main)

- [ ] `pnpm check` — 0 errors, no new warnings
- [ ] `pnpm test:unit -- --run --reporter=basic` — all pass (~12,621 + new lock-test)
- [ ] `pnpm build` — green
- [ ] Browser smoke: fresh DSA, fill **every loan family** end-to-end through to results page
  - Home Loan — New Loan
  - LAP — Term Loan / DOD variants
  - Plot Loan — Plot Only / Plot+Construction / Plot+Equity / Construction Only / BT
  - Personal Loan — Term Loan + OD facilities
  - Business Loan — Term Loan + OD/CC facilities
  - Professional Loan — Term Loan + OD facilities
- [ ] Verify in MongoDB that newly-submitted snapshots use the new shape (no `PlotLoanActivity` / `LAPType` / `unSecureLoanType` keys)
- [ ] Browser-clear localStorage + sessionStorage on every team tester before they reopen the app post-merge (instructions in runbook)
- [ ] Grep `src/` for any of the three legacy names — zero hits (lock-test from Batch 9 enforces this)
- [ ] `git fetch origin && git log HEAD..origin/main` — confirm no divergence

---

## 6. Carry-overs (NOT in this PR)

These are noted now and handled separately:

- **Archive `homeLoanApi.ts` + 2 dormant offer pages + 4 dead OFFERS constants + BottomTabs `/loan-offers` nav link + 3 dormant storage keys.** Confirmed dead by investigation 2026-05-31. Tracked as follow-up task.
- **Plot & Equity Loan Phase 2-4** — engine 3-cap calculation, parser spec, offer-card UI. Sequenced after this rename per ADR-0021.
- **RM Questionnaire Pass 2** — schema redesign for slab/matrix inputs. Owner-deferred until nomenclature work completes.
- **bank-loan-management repo rename** — out of scope here. Either dead (most likely) and stays as-is, or owner decides to refresh it in a future session.

---

## 7. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A `loanType` read in payload code IS the Plot-variant axis but I miss it during the audit | Low-Medium | Medium | Lock-test from Batch 9 catches any remaining `PlotLoanActivity` references; browser smoke through every Plot variant catches functional regressions |
| Snapshot regeneration silently changes a value beyond the rename | Low | Medium | Manual diff every regenerated snapshot before commit |
| Question ID collision (`q2_loanType` for Plot scope vs Home/LAP/PL/BL/Prof Scope) | Medium | Low | Disambiguate during Batch 2; likely keep per-loan-family question IDs |
| A test journey's pre-page-fill expects old field names from prior journeys | Low | Low | Test failures surface immediately; fix in same batch |
| Operator forgets to run wipe script and tests with old data | Low | Medium | Runbook checklist; lock-test verifies code clean at minimum |
| Browser session caches leak across team testers and one fails to clear | Medium | Low | Runbook step makes it explicit; the form will fail on the first stale write |

---

## 8. References

- [LOAN-FIELD-NOMENCLATURE.md](LOAN-FIELD-NOMENCLATURE.md) — conceptual spec (to be amended in Batch 11)
- [ADR-0020](../adr/0020-loan-field-nomenclature.md) — decision record (to be amended in Batch 11)
- [PITFALLS.md](../PITFALLS.md) — Pitfall #33 (to be marked obsolete in Batch 10), Pitfall #41 (updated in Batch 10), Pitfall #66 (informs lock-test regex shape in Batch 9)
- [CLAUDE.md §3, §4, §16](../../CLAUDE.md) — to be updated in Batch 10
- [LOAN-ASSESSMENT-API-INTEGRATION.md](../LOAN-ASSESSMENT-API-INTEGRATION.md) — stale claim to be corrected in Batch 11
- Audit screenshot: CS-2026-0230 (Plot Loan Only Ghaziabad case)
