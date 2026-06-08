---
type: reference
status: active
last_verified: 2026-06-02
owner: tech@digitaldsa.com
extracted_from: CLAUDE.md
section: "§4 — Pre-Flight Grep Checks"
---

# Pre-Flight Grep Checks

This file holds the per-pitfall grep recipes that used to live in CLAUDE.md §4. Each grep is a 5-second sanity scan paired with a pitfall in [`PITFALLS-INDEX.md`](PITFALLS-INDEX.md) / [`PITFALLS.md`](PITFALLS.md).

Before claiming "done" on any non-trivial change, run the greps scoped to your change area. `/end` should also fan these out as part of its verification Workflow.

Add a new grep when you add a new pitfall. The grep IS the pitfall's regression test until a CI lock test exists.


Before claiming "done" on any non-trivial change, run the greps that map to your change area. Each is a 5-second sanity scan — they have caught real regressions.

```bash
# JSON-Logic null checks (Pitfall #1)
grep -rn "'!=':\s*\[" src/lib/config/      # any !=, switch to !

# Server→client field forwarding (Pitfall #2)
grep -n "toClientOption\|toClientQuestion" src/lib/server/formEngine/

# Module-scope fetch (Pitfall #4)
grep -rnE "^(let|const|export).*= (await )?fetch\(" src/

# Vercel Node version pin (Pitfall #7)
grep -A1 '"engines"' package.json          # confirm specific major (e.g. "22.x")

# CJS→ESM crossing after dependency changes (Pitfall #7)
# Run after pnpm install/update — compare noExternal list against actual SSR externals
grep -A20 'noExternal' vite.config.ts      # review: does the list cover new deps?

# SSR-broken typeof window guard (Pitfall #9)
grep -rn "typeof window !== 'undefined'" src/  # any hit, switch to browser flag

# Reactive prop in $state (Pitfall #10)
pnpm check 2>&1 | grep state_referenced_locally   # 0 expected

# Payload snapshot drift (Pitfall #11)
pnpm test:unit -- --run schemaFixtureFactory 2>&1 | grep -E "FAIL|toEqual"

# Auto-clear parity (Pitfall #12)
grep -l "clearStaleOptionValues\|shouldShow.*answersContext" src/routes/\(app\)/form/

# combinedAnswers collision (Pitfall #13) — full bindsTo keys only
grep -rn "combinedAnswers\." src/lib/components/ | grep -vE "(propertyStateName|residenceStateName|businessStateName|loanName|loanType)"

# Numeric fields without explicit minLimit (Pitfall #14)
# CI test (numericFieldsHaveExplicitLimits) is authoritative; this grep is for quick local scan.
pnpm test:unit -- --run numericFieldsHaveExplicitLimits 2>&1 | grep -E "FAIL|missing"

# Unsanitized {@html} (Pitfall #15) — should match only the documented exceptions
grep -rn '{@html' src/ | grep -v sanitizeHtml | grep -v _archive

# Wording drift across question/page/sidebar (Pitfall #16) — after repurposing a question
grep -rn "Residence Location\|Loan Processing Location\|Business Location" src/lib/config/

# Floating popovers using position:absolute (Pitfall #17) — should be position:fixed for modal-safe rendering
grep -rn "position:\s*absolute" src/lib/components/ | grep -iE "dropdown|popover|tooltip|menu|autocomplete"

# Per-applicant validation that ignores case-level DC/BT/Top-up (Pitfall #18)
grep -rn "loanVariant" src/lib/utils/incomeTabState.ts src/routes/\(app\)/form/

# Calendar-decorated text inputs missing the month-picker uiType (Pitfall #19)
# Authoritative CI test: monthPickerWiring.test.ts
pnpm test:unit -- --run monthPickerWiring 2>&1 | grep -E "FAIL|monthYear"

# Cross-loan applicant carryover — loan-type change must call migrate helper (Pitfall #20)
grep -n "migrateApplicantsToRecoveryOnLoanSwitch" src/routes/\(app\)/form/how-can-we-help/+page.svelte  # must match

# Validation timing — cross-field rules fire on Next-click ONLY, not per-keystroke (Pitfall #21)
# S104 reverted S103's per-keystroke wiring. updateAnswerByKey MUST NOT call
# debouncedEvaluate. onNext awaits evaluateOnServer + tick before navigating.
grep -rnE "debouncedEvaluate\(currentPageIndex\)" src/routes/\(app\)/form/*.svelte \
  src/routes/\(app\)/form/*/+page.svelte \
  src/routes/\(app\)/form/unsecure-loan/*/+page.svelte  # 0 expected
# Authoritative CI test: loanPageValidationTiming.test.ts
pnpm test:unit -- --run loanPageValidationTiming 2>&1 | grep -E "FAIL"

# Stale director auto-entry — orphan check must also verify Company-applicant existence (Pitfall #22)
grep -A3 "Step 1a:" src/lib/utils/directorAutoIncome.ts | grep -E "companyExists|applicants\.some"  # must match

# hasEquity auto-derive must not auto-set false from ownership=0 (Pitfall #23)
grep -n "hasEquity: ownershipPercent" src/lib/utils/directorAutoIncome.ts  # 0 expected — use conditional set

# Income-profile deselect must drop entries (Pitfall #24)
# Authoritative CI test: unsecuredApplicantHandlers.test.ts
pnpm test:unit -- --run unsecuredApplicantHandlers 2>&1 | grep -E "FAIL|drops"

# Director save must persist immediately, not defer to Next (Pitfall #25)
# Authoritative CI test: directorSavePersistence.test.ts
pnpm test:unit -- --run directorSavePersistence 2>&1 | grep -E "FAIL|commitDirectors"

# Disabled-Next must always surface a reason (Pitfall #26)
# Authoritative CI test: obligationsDisabledReason.test.ts
pnpm test:unit -- --run obligationsDisabledReason 2>&1 | grep -E "FAIL"

# OTel span scrubbing — every new attribute added to span data must be
# audited for PII (Pitfall #27)
pnpm test:unit -- --run obsTelemetryScrubbing 2>&1 | grep -E "FAIL"
# Also: any new auto-instrumentation MUST be reviewed against PII_ATTR_KEYS
grep -A20 "PII_ATTR_KEYS = new Set" src/lib/server/telemetry.ts  # review when adding instrumentation

# TanStack Query v6 — never use $-prefix on createQuery result (Pitfall #28)
grep -rnE '\$[a-zA-Z_]*Query\.' src/routes src/lib  # 0 expected — use bare-name access

# Auto-entry display fields cached + locked (Pitfall #29)
# Authoritative CI test: directorAutoIncome.test.ts "entityName sync on Company rename"
pnpm test:unit -- --run directorAutoIncome 2>&1 | grep -E "FAIL|entityName sync"
# Also: every locked auto-entry field MUST have a reconcile pass AND a parent-edit trigger.
# When adding a new locked field, audit syncAutoIncomeEntries Step 1a-name pattern.

# Component-local restoreAskedForKey state (Pitfall #30) — must be in applicantState
grep -rnE 'let\s+restoreAskedForKey\s*[:=]' src/lib/components src/routes \
  | grep -v '// '   # 0 expected — declared as comment is OK (migration marker)

# Closure-plan stale-validity gate (Pitfall #31)
# Authoritative CI test: obligationClosureScrub.test.ts
pnpm test:unit -- --run obligationClosureScrub 2>&1 | grep -E "FAIL"
# When adding a new journey-dependent enum: must wire scrub + UI + Next gate together.

# Restore guard slot-type hint (Pitfall #32) — every restoreIntentState.set must
# include slotApplicantType (and slotCompanyType for Companies)
grep -rnE 'restoreIntentState\.set\(\{' src/lib/components src/routes \
  -A 8 | grep -L 'slotApplicantType'   # 0 expected — every set should carry the hint

# Plot Loan's loanVariant must fall back to PlotLoanActivity (Pitfall #33)
grep -n 'loanVariant=' src/routes/\(app\)/form/plot-loan/+page.svelte \
  | grep -v 'PlotLoanActivity'   # 0 expected

# BT applicant-structure role-distribution warning (Pitfall #34)
pnpm test:unit -- --run btMismatchWarning 2>&1 | grep -E "FAIL"

# Restore modal type segregation (Pitfalls #35/#36/#37) — RestoreApplicantModal
# must consult restoreIntentState for director-slot context. Smoke check:
grep -n "directorRestore\|DIRECTOR_RELEVANT_PROFILES\|section-header" \
  src/lib/components/RestoreApplicantModal.svelte | head -6
# Expected: imports restoreIntentState, defines DIRECTOR_RELEVANT_PROFILES set,
# renders section-header CSS class.

# Loan-switch chokepoint (Pitfall #38) — all loan-type transitions go through
# `switchLoanType`. The picker should not call `migrateApplicantsToRecoveryOnLoanSwitch`
# directly anymore; that helper is now invoked only from inside the orchestrator.
grep -rnE "migrateApplicantsToRecoveryOnLoanSwitch\(" src/routes src/lib \
  | grep -v 'loanSwitchOrchestrator\|loanTypeChangeCleanup'  # 0 expected
# Authoritative CI test: loanSwitchOrchestrator.test.ts
pnpm test:unit -- --run loanSwitchOrchestrator 2>&1 | grep -E "FAIL"
# When adding a new global store scoped to the active loan, register it in
# src/lib/utils/loanSwitchOrchestrator.svelte.ts via registerLoanSwitchOwner().

# ConfirmModal dismissal must route through dismissConfirmModal (Pitfall #39)
# The component MUST wire every dismissal path (X / Escape / backdrop / native
# <dialog> onclose) through `dialogState.dismissConfirmModal()` — not
# `closeConfirmModal()` — so the caller's onCancel fires. Programmatic closes
# inside callback handlers (e.g. after a successful onConfirm action) still
# use closeConfirmModal legitimately, so the grep is a smell-check, not a
# hard zero-expected. Scan ConfirmModal.svelte template attributes specifically:
grep -nE 'onclose=|onclick=|onkeydown=' src/lib/components/ConfirmModal.svelte
# Expected: every match calls dismissConfirmModal (or handleConfirm for the
# explicit Confirm button). Any call to closeConfirmModal in a dismissal
# listener is a Pitfall #39 regression.
#
# Authoritative CI test: confirmModalDismissal.test.ts
pnpm test:unit -- --run confirmModalDismissal 2>&1 | grep -E "FAIL"

# PendingRestoreBanner Cancel must signal component buffers (Pitfall #40)
# cancelApplicantRestore() MUST call restoreIntentState.markCancelled() so the
# Business sole-prop inline Proprietor form can resync its local formApplicant
# buffer. Without the signal, Cancel rewinds formState but the visible fields
# keep showing restored values, and the next Next-click silently re-persists them.
grep -n "markCancelled" src/lib/utils/applicantRestoreHandler.ts  # must match
grep -n "restoreIntentState.cancelledAt\|clearCancelled" \
  src/lib/components/AddApplicantBusiness.svelte  # must match
#
# Authoritative CI test: applicantRestoreCancel.test.ts
pnpm test:unit -- --run applicantRestoreCancel 2>&1 | grep -E "FAIL"

# Loan variant change must reset per-loan page index (Pitfall #41)
# The picker (how-can-we-help) MUST detect changes to variant-shaping keys
# (`loanType`, `facilityType`, `loanVariant`) within the same loan name and
# call resetLoanPageIndex() from the orchestrator. Without it,
# Continue-Where-I-Left-Off lands on a semantically different page.
# (Post-2026-05-31 rename: PlotLoanActivity / unSecureLoanType / LAPType
# retired — see ADR-0020 and Pitfall #33.)
grep -n "VARIANT_SHAPING_KEYS\|resetLoanPageIndex" \
  src/routes/\(app\)/form/how-can-we-help/+page.svelte    # both must match
grep -n "PAGE_INDEX_FIELD_BY_LOAN\|export function resetLoanPageIndex" \
  src/lib/utils/loanSwitchOrchestrator.svelte.ts          # both must match
#
# Authoritative CI test: loanVariantPageIndexReset.test.ts
pnpm test:unit -- --run loanVariantPageIndexReset 2>&1 | grep -E "FAIL"

# Reload detection on loan +page.svelte must go through isReloadOfCurrentPath (Pitfall #42)
# Inline `performance.getEntriesByType('navigation')` is stale across SvelteKit
# client-side navigation — one F5 anywhere in the tab makes every subsequent
# loan-page mount falsely read as a reload, re-firing the SessionResumeModal.
grep -rnE "getEntriesByType\(['\"]navigation['\"]\)" src/routes src/lib/components \
  | grep -v isReloadOfCurrentPath  # 0 expected — util is the only allowed caller
#
# Authoritative CI test: isReloadOfCurrentPath.test.ts
pnpm test:unit -- --run isReloadOfCurrentPath 2>&1 | grep -E "FAIL"

# Sanction-letter / property-not-identified leak (Pitfall #43)
# Any "property not identified" guard MUST key off the explicit 'No' answer or the
# absence of propertyCost — NEVER the coerced payload.propertyIdentified boolean
# (toBoolean(undefined)===false makes LAP/Plot look unidentified).
grep -rn "propertyIdentified !== false\|propertyIdentified === false" src/lib/utils/payloadBuilder/  # 0 expected
# Affordability cards must be gated, not auto-computed into the rendered list:
grep -rn "selectAffordabilityScenarios" src/lib/ruleEngine/evaluationEngine.ts  # must match
# Authoritative CI tests:
pnpm test:unit -- --run affordabilityScenarioGating propertyNotIdentifiedPayload propertyNotIdentifiedTrafficLight 2>&1 | grep -E "FAIL"

# Director-in-Company income must link to a Company applicant (Pitfall #44)
# The director_company entity field must be a company SELECT (or a locked auto
# field) — never a bare free-text TextField that lets a conflicting company name
# be typed. The combobox is sourced from assembleCompanyNameOptions.
grep -n "assembleCompanyNameOptions\|handleCompanySelect" src/lib/components/IncomeSourceForm.svelte  # must match
# Authoritative CI tests:
pnpm test:unit -- --run companyNameOptions directorSameCompanyIncomeGate 2>&1 | grep -E "FAIL"

# Single-vs-multi applicant view must be entity-aware, not count-based (Pitfall #45)
# A Company is ALWAYS multi (cards+modal); only a lone Individual is single. Both
# IncomePageNew and the loan +page.svelte must decide via rendersAsSingleApplicant.
grep -rnE "applicants\.length (===|<=) 1" src/lib/components/IncomePageNew.svelte \
  src/routes/\(app\)/form/unsecure-loan/business-loan/+page.svelte \
  | grep -iv rendersAsSingleApplicant   # 0 expected for the single/multi switch
grep -n "rendersAsSingleApplicant" src/lib/components/IncomePageNew.svelte \
  src/routes/\(app\)/form/unsecure-loan/business-loan/+page.svelte   # must match
# Authoritative CI tests:
pnpm test:unit -- --run applicantViewMode businessLoanPageVisibility 2>&1 | grep -E "FAIL"

# Director auto-income sync pairing (Pitfall #46) — every commitDirectorsToApplicants
# call site MUST be followed by syncAutoIncomeEntries. Static-scan locks BL+Prof:
pnpm test:unit -- --run directorAutoIncomeWiring 2>&1 | grep -E "FAIL"
# When adding a new director-save commit site (modal-save, restore-apply, etc.):
# mirror the pattern at AddApplicantBusiness handleDirectorSave / applyDirectorRestore.

# Pre-submit ConfirmModal wiring (Pitfall #47) — every loan +page.svelte submit
# MUST go through confirmAndSubmit (NOT a direct submitFormForEvaluation call).
# Direct calls bypass the modal and consume a case slot without warning under
# the incoming monthly-quota billing model.
grep -rn "submitFormForEvaluation(" src/routes/\(app\)/form/ \
  | grep -v confirmAndSubmit  # 0 expected — only the wrapper calls it
grep -rn "confirmAndSubmit(" src/routes/\(app\)/form/ | wc -l  # expect 6 (one per loan)
#
# Offer page MUST guard browser-back to the form:
grep -n "beforeNavigate\|/form/" \
  src/routes/dashboard/dsa/cases/\[case_id\]/results/+page.svelte | head -6
# Expected: imports beforeNavigate from $app/navigation, registers handler,
# filters on pathname.startsWith('/form/'), calls nav.cancel() + openConfirmModal.
#
# Authoritative CI test: preSubmitConfirmWiring.test.ts
pnpm test:unit -- --run preSubmitConfirmWiring 2>&1 | grep -E "FAIL"

# DirectorRemovePickerModal confirm commits to formState (Pitfall #52) —
# Any handler that mutates `directorForms` in response to a user picker
# action MUST be followed by commitDirectorsToApplicants + syncAutoIncomeEntries
# + formState.replaceApplicants in the same function body. Without this,
# the stale company.directors array resurrects the removed director on a
# later Previous→Next remount (BL "Tanisha reappears" repro).
#
# Quick scan: every `directorForms = ` assignment in a USER-action handler
# (not the init $effect) in AddApplicantBusiness/Professional:
grep -nE 'directorForms\s*=' src/lib/components/AddApplicantBusiness.svelte \
  src/lib/components/AddApplicantProfessional.svelte | grep -v 'directorForms = \[\]'
# For each match outside the init $effect, verify commitDirectorsToApplicants
# follows in the same function body.
#
# Authoritative CI test: directorRemovePickerCommit.test.ts
pnpm test:unit -- --run directorRemovePickerCommit 2>&1 | grep -E "FAIL"

# Case-level disabled-Next reason wiring (Pitfall #53) — every unsecured
# loan +page.svelte MUST import getCaseLevelDisabledReason AND wire
# caseLevelDisabledReason into the FormNavigationBar disabledReason prop.
# Without it, multi-applicant DC routes silently disable Next with no message.
grep -L "getCaseLevelDisabledReason" \
  src/routes/\(app\)/form/unsecure-loan/personal-loan/+page.svelte \
  src/routes/\(app\)/form/unsecure-loan/business-loan/+page.svelte \
  src/routes/\(app\)/form/unsecure-loan/professional-loan/+page.svelte
# Expected: zero output (every file matches).
#
# Authoritative CI test: caseLevelDisabledReasonWiring.test.ts
pnpm test:unit -- --run caseLevelDisabledReasonWiring 2>&1 | grep -E "FAIL"

# Proactive JWT refresh scheduler (Pitfall #54) — (app)/+layout.svelte must
# mount it on onMount; auth.logout must stop it.
grep -nE "startTokenRefreshScheduler|stopTokenRefreshScheduler" \
  src/routes/\(app\)/+layout.svelte    # both names must appear
grep -n "stopTokenRefreshScheduler" src/lib/state/auth.svelte.ts    # must match

# InputField onInput requires validateOnInput (Pitfall #55) — InputField.svelte
# only invokes the onInput callback when validateOnInput=true. Without it,
# the callback is silently dead — typing never fires persistence/validation.
# DOM still updates via bind:value so the bug LOOKS like the data is there
# until you navigate away and back (then it's gone — the persistence never ran).
#
# Authoritative CI test: inputFieldOnInputWiring.test.ts (recursive scan of every
# .svelte file under src/lib + src/routes excluding _archive).
pnpm test:unit -- --run inputFieldOnInputWiring 2>&1 | grep -E "FAIL"

# Director stake recompute on entity-switch / count-change (Pitfall #56) —
# both BL + Prof must import recomputeStakeAfterEntityChange. BL's
# selectEntityType + handleRemovePickerConfirm must call it; both
# applyDirectorRestore variants must reset restoreIntentState on guard-fail.
grep -n "recomputeStakeAfterEntityChange" \
  src/lib/components/AddApplicantBusiness.svelte \
  src/lib/components/AddApplicantProfessional.svelte    # both must match
grep -n "restoreIntentState.reset" \
  src/lib/components/AddApplicantBusiness.svelte \
  src/lib/components/AddApplicantProfessional.svelte    # both must match in applyDirectorRestore
#
# Authoritative CI test: directorStakeRecompute.test.ts
pnpm test:unit -- --run directorStakeRecompute 2>&1 | grep -E "FAIL"

# Unsecured-loan NRI flip stashes business income (Pitfall #57) — all 3
# AddApplicant components must import + call applyNriIncomeStashForApplicant.
grep -n "applyNriIncomeStashForApplicant" \
  src/lib/components/AddApplicantBusiness.svelte \
  src/lib/components/AddApplicantProfessional.svelte \
  src/lib/components/AddApplicantPersonal.svelte    # all 3 must match
#
# Authoritative CI test: nriIncomeStash.test.ts
pnpm test:unit -- --run nriIncomeStash 2>&1 | grep -E "FAIL"

# Corporate DC obligation gate (Pitfall #58) — ObligationCapture must pass
# applicantType + caseHasCompany. getCaseLevelDisabledReason must require a
# Company-applicant closure mark when caseHasCompany on DC.
grep -n "caseHasCompany" src/lib/components/ObligationCapture.svelte    # must match
grep -n "caseHasCompany\|COMPANY-level" src/lib/utils/incomeTabState.ts # both must match
#
# Authoritative CI test: companyDCObligationGate.test.ts
pnpm test:unit -- --run companyDCObligationGate 2>&1 | grep -E "FAIL"

# Token refresh scheduler eager + coalesced (Pitfall #59) — startTokenRefreshScheduler
# must invoke requestTokenRefresh (eager first call); secureFetch must use the
# public wrapper not inline refreshInFlight assignment.
grep -A20 "export function startTokenRefreshScheduler" src/lib/utils/csrf.ts | grep -c "requestTokenRefresh"
grep -B2 -A4 "response.status === 401" src/lib/utils/csrf.ts | grep "requestTokenRefresh"
#
# Authoritative CI test: tokenRefreshScheduler.test.ts
pnpm test:unit -- --run tokenRefreshScheduler 2>&1 | grep -E "FAIL"

# Updating roadmap counts for SEC-5 / DX-2 / DX-4 after a sweep batch
# Authoritative source: docs/ARCHITECTURE-EVOLUTION.md "Active Roadmap" table

# CSRF on raw fetch (state-changing requests must use secureFetch)
grep -rnE 'fetch\([^)]*method:\s*["'\'']POST|PUT|DELETE|PATCH' src/lib src/routes \
  | grep -v secureFetch                    # 0 expected

# Bare console.log/error/warn (Pitfall: use logger)
grep -rnE 'console\.(log|error|warn)\(' src/lib/server src/routes/api/  # 0 expected

# Co-Authored-By in commits (forbidden)
git log --since='1 week' --pretty=format:'%B' | grep -i 'co-authored-by'  # 0 expected

# mongodb-client-encryption native build (Pitfall #48) — worktree workflows ONLY
# Run this when auth/CSFLE endpoints 500 in a worktree but `main` works.
# If the .node file is absent, pnpm skipped the postinstall — run pnpm approve-builds.
ls node_modules/mongodb-client-encryption/build/Release/*.node 2>/dev/null  # expect a path; empty ⇒ run `pnpm approve-builds`

# D.1 S3 charge cron — probe ChargeAttempts before provider.chargeMandate (Pitfall #61)
# The engine MUST query ChargeAttempts for a succeeded row on
# (subscription_id, cycle_anchor) BEFORE every provider.chargeMandate call AND
# must persist the pending ChargeAttempt row BEFORE the provider call (two-phase
# persist, R1). Without either, a cron firing twice double-charges.
# Run after touching src/lib/server/billing/chargeEngine.ts:
pnpm test:unit -- --run billing/chargeEngineIdempotency 2>&1 | grep -E "FAIL"
# When adding a NEW charge code path (S4 retry / dunning recovery / manual operator
# trigger): same invariant applies — probe first, persist pending row, then call
# provider. Add the new call site to the static-scan if it lives in a different file.

# IncomeProfileSelector auto-drop $effect (Pitfall #62) — the $effect that
# filters selectedProfiles by card-level showWhen must keep all 5 invariants:
# shouldShow import, empty-answersContext guard, locked-profile exemption,
# shouldShow(card.showWhen, ...) filter, onSelectionChange?.(filtered) emit.
# Without any one of these, NRI=Yes (or any answer that hides a card) leaves
# stale selectedProfiles + orphaned incomeEntries — Income Details dead-end.
pnpm test:unit -- --run incomeProfileSelectorAutoDrop 2>&1 | grep -E "FAIL"

# Archived route folders must compile standalone (Pitfall #63) — every
# `+server.ts` inside a `_archive*` folder under src/routes/ MUST import
# ONLY from './$types' and '$lib/server/apiResponse.js' (i.e. be a 410
# stub). Any business-logic import (`$lib/server/billing/`,
# `$lib/database/`, etc.) is a latent Vercel build break waiting for the
# next time the imported symbol gets retired. SvelteKit's `_` prefix
# does NOT exclude the file from Vite/Rollup's build graph — only from
# URL registration. `@ts-nocheck` does NOT save you here either; it
# silences svelte-check but Rollup still resolves imports.
for f in $(find src/routes -path "*_archive*/+server.ts" -o -path "*_archived*/+server.ts"); do
  grep -E "^import .* from '\\\$lib/" "$f" \
    | grep -v "apiResponse" \
    && echo "  ↑ Pitfall #63: $f has a non-stub import"
done
# Expected: no output. Any "↑ Pitfall #63" line means an archived
# handler is one symbol-retirement away from breaking Vercel.

# Guarantor / independent-financial capacity calcs (Pitfall #64) — any
# engine block reading per-source income for a guarantor / non-applicant-
# full-financial classification MUST use assessed_amount, NEVER
# final_amount. final_amount is zero by design for these classifications
# (incomeAssessorV2.ts:146); reading it gives every guarantor 0% capacity
# → universal reject.
grep -rnE "applicant_index === guarantorIdx|classification === 'guarantor_financial'|classification === 'non_applicant_full_financial'" \
  src/lib/ruleEngine/ -A 5 | grep -E "s\.final_amount"
# Expected: empty.
# Authoritative CI test: guarantorEligibilityAssessment.test.ts
pnpm test:unit -- --run guarantorEligibilityAssessment 2>&1 | grep -E "FAIL"

# Pitfall #65 — adjacent-validator scan on auth / nav / redirect file edits
# Heuristic, no grep. Apply on any file under
# src/routes/**/(login|signup|auth|onboarding)/** or any code importing
# from $app/navigation that does window.location.href = or goto(.
# Required scan BEFORE declaring the fix complete:
#   grep -nE "isSafe|safeRedirect|sanitize|validate|allowlist|whitelist|safelist" <file>
# Surface every helper hit and verify: (a) is it wired to the nav site
# you're editing? (b) are its rules strict (same-origin path-only, no
# /api/ prefix, no //protocol-relative, no \ anywhere)? Either gap is a
# Pitfall #65 regression.

# Pitfall #66 — negative-check regex shape audit (test-design rule)
# When reviewing any removal-lock assertion in *.test.ts:
grep -rnE "expect\([^)]*src[^)]*\)\.not\.toMatch" src/lib/testing
# For each match, verify the regex targets a USAGE shape:
#   type X         <X>          X(          .X          X =         X:
# NOT a bare identifier (which trips on removal-decision comments).
# No CI lock — institutional discipline applied at PR review.

# Pitfall #67 — enricher branches reading stale flat-field shapes
# After any change to profileFormConfig.ts *_INCOME_FIELDS or payloadEnricher.ts
# extractGrossFromEntry, scan for the three legacy keys that the live
# `professional_practice` form NEVER emits. Any hit in production code is
# a Pitfall #67 regression.
grep -n "inc.netProfessionalIncome\|inc.averageMonthlyReceipts\|inc.averageMonthlyExpenses" \
  src/lib/ruleEngine/payloadEnricher.ts  # 0 expected
# The applicant-selection heuristics still read these keys (suggestPrimaryApplicant,
# plApplicantSelector, SuggestPrimaryBanner) — that's a known follow-up affecting
# ranking only, not whether offers appear. When that follow-up ships, expand
# this grep to src/lib/ruleEngine + src/lib/components.
#
# Authoritative CI tests:
pnpm test:unit -- --run payloadEnricher 2>&1 | grep -E "FAIL"
pnpm test:unit -- --run incomeAssessorV2 2>&1 | grep -E "FAIL"

# Pitfall #69 — BT+Top-up dual-tenure math hardcoded for all lenders
# Heuristic-only (no automated lock). When any new code touches the rule
# engine and references 'Balance Transfer With Top-up' as a gating literal
# outside the existing dual-tenure block in evaluationEngine.ts, re-read
# PITFALLS.md #69 before shipping — the new code may be re-encoding the
# universal "all lenders use dual-tenure" assumption that pitfall flags.
Select-String -Path "src/lib/ruleEngine/**/*.ts" `
  -Pattern "Balance Transfer With Top-up" `
  | Where-Object { $_.Path -notmatch "evaluationEngine\.ts" }
# Expected output (current state): zero hits outside evaluationEngine.ts.
# Any new hit needs review against the per-lender flag design in PITFALLS.md #69.
#
# The per-lender flag (bt_topup_treatment) is deferred — see
# TECH-DEBT-CLEANUP-2026-05-31.md §6 for the tracked future implementation.

Add a new grep when you add a new pitfall. The grep IS the pitfall's regression test until a unit test exists.

# Pitfall #70 — Tailwind v4 escape-decoder crash on backslash + 6-hex-digit sequences
# Run before pushing any doc change that touches Windows paths or escape-looking
# tokens. The bug crashes the Vite build with "Invalid code point N" pointing at
# src/app.css, but the actual culprit is whatever scanned source file contributed
# a leading-`--` token containing the offending sequence.
#
# IMPORTANT — these greps are best-effort over-inclusive triage filters, NOT a
# precise gate. They flag every backslash-prefixed segment whose first 6 chars
# are hex digits, regardless of whether the value exceeds 0x10FFFF (the actual
# crash threshold) and regardless of consume-and-advance semantics in Tailwind's
# regex. Treat any match as "review manually" — many will be safe (decoded
# values within Unicode range, or even-count backslash runs that consume safely).
#
# The authoritative gate is `pnpm build` itself: it runs Tailwind for real and
# fails loudly with the decoded value. ALWAYS verify a doc edit containing
# Windows paths with `pnpm build` before pushing.
#
# Practical vector (multi-segment backslash paths in tracked docs — typical
# auto-memory paste shape):
grep -rEn '\\[a-zA-Z]+\\[a-zA-Z]+\\' docs/ --include="*.md"  # review every match

# Precise trigger shape (backslash immediately followed by 6 hex digits) across
# all scanned source — not just .md:
grep -rEn '\\[0-9a-fA-F]{6}' docs/ src/ scripts/ \
  --include="*.md" --include="*.ts" --include="*.svelte" --include="*.mjs" --include="*.css"
  # review every match — safe values are 0x10FFFF and below

# Authoritative check (slow — ~15s, but unambiguous):
pnpm build 2>&1 | grep -E "Invalid code point"  # 0 expected

---

# Pitfall #73 — DatePickerYearAndMonth re-mounts auto-applying stale dialogState picks
# Any component reading dialogState.selectedDate in a $effect MUST snapshot
# dialogState.selectionEpoch on mount and only react when the epoch advances past
# that snapshot. Without the gate, fresh mounts auto-apply the last user-confirmed
# pick from a previous modal session — silently overwriting blank or saved values
# (bit Home Loan single-applicant Income Details with two business proprietorship
# entries 2026-06-03 / HL-2026-0071).

# 1) Components reading selectedDate — only the canonical wrapper should appear.
grep -rn "dialogState.selectedDate" src/lib/components --include="*.svelte"
# Expected: DatePickerYearAndMonth.svelte ONLY.
# Any other component reading selectedDate directly is a re-introduction risk —
# refactor to use DatePickerYearAndMonth, or replicate the epoch-snapshot pattern.

# 2) Routing-match check WITHOUT a sibling epoch gate (pre-fix shape).
grep -rEn "ctx\.applicantIndex\s*!==\s*applicantIndex" src/lib/components --include="*.svelte"
# Expected: 1 match inside DatePickerYearAndMonth.svelte $effect, paired with a
# lastSeenEpoch baseline guard in the same $effect block. A match WITHOUT the
# epoch guard = bug re-introduced.

# 3) Writer-side — every confirmed-pick path must tick the epoch.
grep -rn "dialogState.selectedDate\s*=" src/lib/components --include="*.svelte"
# Expected: 1 match inside MonthYearModal.svelte's selectMonthYear, immediately
# followed by `dialogState.selectionEpoch += 1`. Any other writer must also tick.

---

## §74 — Browser-emulation libraries (`jsdom`, `happy-dom`) in the SSR bundle

Paired with Pitfall #74 + ADR-0031. Any of these returning non-zero
matches against `main` is a regression — escalate to a code review
against ADR-0031 before merging.

```bash
# 1) Direct jsdom imports in src/
grep -rE "from ['\"]jsdom['\"]|require\(['\"]jsdom['\"]\)" src/
# Expected: ZERO matches.

# 2) isomorphic-dompurify or happy-dom anywhere
grep -rE "isomorphic-dompurify|from ['\"]happy-dom['\"]" src/ package.json
# Expected: ZERO matches. (sanitize-html in package.json is fine.)

# 3) vite.config.ts noExternal containing jsdom-adjacent packages
grep -nE "'jsdom'|'isomorphic-dompurify'|'happy-dom'|'html-encoding-sniffer'|'@exodus/bytes'" vite.config.ts
# Expected: ZERO matches.

# 4) Any browser-emulation library in src/
grep -rE "from ['\"](jsdom|happy-dom|linkedom)['\"]" src/
# Expected: ZERO matches. (linkedom for narrow XML parsing might be
# acceptable in a future single-purpose tool, but never for
# general-purpose DOM emulation in SSR — review the use case.)
```

---

## §78 — Form-wrapper `<label for=>` ↔ `<input id=>` association

Paired with Pitfall #78 + lock test `src/lib/testing/__tests__/formLabelIdAssociation.test.ts`.
Any of these returning non-zero matches against `main` is a regression — re-run the lock
test and re-open DevTools Issues on the affected form before merging.

```bash
# 1) Array-mode inputs in shared wrappers must use the ternary, never the bare suffix
grep -nE 'id=\{`\$\{id\}_\$\{i\}`\}' src/lib/components/*.svelte
# Expected: ZERO matches. After 2026-06-06 fix, array inputs use
# `id={i === 0 ? id : `${id}_${i}`}` so the outer <label for={id}>
# associates with the first input. A match means a wrapper regressed.

# 2) DirectorCountPicker must not re-introduce the hardcoded literal id
grep -nE 'id="director-count-custom"' src/lib/components/DirectorCountPicker.svelte
# Expected: ZERO matches. The custom input id now derives from the
# component's `id` prop via `${id}_custom`.

# 3) Any shared component hardcoding a static string id on an <input> / <button> / <select>
grep -nE 'id="[a-z][a-z0-9-]+"' src/lib/components/*.svelte
# Expected: only matches in components that are guaranteed to mount AT MOST
# ONCE per page (e.g., a singleton modal). Each match is a duplicate-id risk
# if the component ever gets reused in a list/grid surface.

# 4) Wrappers that own a `<label for={id}>` must also forward `id` to a focusable element
grep -nE 'for=\{id\}' src/lib/components/*.svelte
# For each match: confirm the same file contains `id={id}` or
# `id={i === 0 ? id : ...}` on at least one <input>/<select>/<textarea>/<button>.
# If not, the label points at nothing.

# 5) Loan-form +page.svelte files: any new `<label for={question.id}>` must pair
#    with a downstream wrapper that forwards id verbatim
grep -nE '<label\s+for=\{question\.id\}' src/routes/\(app\)/form/*/+page.svelte
# Each match must mount a component that takes `id` and forwards it to a
# focusable element (DatePickerYearAndMonth, TextField in single-input mode, etc.).
# Adding a new such site without verifying the downstream component re-introduces
# Pitfall #78.
```

---

