# Credit Risk Intelligence — Implementation Prompt & Instructions

> **Purpose**: Copy-paste this as your opening prompt for a new Claude Code session to implement the Credit Risk Intelligence system correctly.
> **Created**: 2026-02-23 | **For**: DigitalDSA-V3

---

## THE PROMPT (Copy everything below this line)

---

Read these documents in order before doing anything:

1. `docs/CREDIT-RISK-INTELLIGENCE-SPEC.md` — The full vision, 8 risk dimensions, system architecture
2. `docs/HOME-LOAN-SCHEMA-DESIGN.md` — The blueprint: which questions to add/refine, where, and why
3. `CLAUDE.md` — Project conventions, tech stack, rules

Then read `MEMORY.md` for session context and the critical warning about a previous failed attempt.

---

### WHAT WENT WRONG BEFORE (DO NOT REPEAT)

A previous Claude session tried to implement this and failed catastrophically across 3 sessions. The entire restructure was reverted. Here is what went wrong:

1. **Replaced existing working questions instead of adding alongside them** — The old `purchaseType` (Direct Sale/Resale) was ripped out and replaced by `transactionNature` (6 options) using flagKey. This broke the entire form because flagKey values were never resolved. The correct approach: KEEP `purchaseType` working, ADD `transactionNature` as a NEW question that ALSO sets `purchaseType` via flagKey for backward compatibility. Or better: don't replace at all until the replacement is proven end-to-end.

2. **Changed the schema without wiring to the rule engine** — 17 new questions were added to the form but NONE were consumed by the rule engine, discomfort analyzer, or result builder. DSAs saw MORE questions but the offers/results were IDENTICAL (or worse, broken). The form got harder but delivered no additional value.

3. **Restructured pages (14→19) without need** — Created new pages (sellerProfile, projectApproval, applicantStability, creditBehavior, propertyCompliance, etc.), moved questions between pages, dissolved existing pages. This broke all test infrastructure, visibility logic, page flow routing, wizard sidebar, and E2E helpers. The existing page structure works fine — new questions can be added to existing pages or minimal new pages can be added.

4. **Worked on the form BEFORE the engine** — Results must improve FIRST, then the form collects more data for them. Not the other way around.

---

### MANDATORY IMPLEMENTATION ORDER

**You MUST follow this order. Do NOT skip ahead.**

#### STEP 1: Wire existing form data better into rule engine (NO form changes)

The current form already collects data that the rule engine underuses:

- `propertyAreaType` (AUTHORITY/CONVERTED/MUNICIPAL/VILLAGE) — not used in risk scoring
- `PropertyStage` (Ready/Under Construction/Plot) — only used in hard gates
- `constructionType` (Flat/House/etc.) — not used in risk scoring
- `propertyComplianceStatus` — not used in approval probability
- `creditScore` + `lowCreditReasons` — underused in per-lender scoring

**Do this first**: Enhance `payloadEnricher.ts` to add `_computed.*` risk classification fields. Enhance `evaluationEngine.ts` Stage 9 or add Stage 9.5 to use these for better per-lender approval_probability and factors. Enhance `resultBuilder.ts` to surface risk-driven factors and suggestions. Enhance `discomfortAnalyzer.ts` with new zone detectors.

**Verify**: Run the app, fill a form with current questions, see that the RESULT PAGE shows richer, more useful output. Only then proceed.

#### STEP 2: Add new questions to EXISTING pages (minimal schema changes)

Add new questions to existing pages. Do NOT create new pages yet. Do NOT remove/replace existing questions.

Priority order for new questions (each must be wired to rule engine BEFORE adding the next):

1. `valuationAssessment` + `cashComponent` → add to `propertyFinancial_homeLoan` (2 questions, wire to Dim 3 scoring)
2. `titleClarity` + `legalEncumbrance` → add to `propertyLegal_homeLoan` ALONGSIDE existing binary questions (4 graduated options, wire to Dim 1 scoring)
3. `bounceQuality` + `recentInquiries` → add after credit score section (wire to Dim 7 scoring)

**For each question added:**

- Add to schema JSON (BOTH copies: `src/lib/config/` AND `src/lib/server/formEngine/schemas/`)
- Add to payload builder types + extraction
- Add to payloadEnricher computed fields
- Wire into evaluation engine scoring
- Wire into result builder output
- Add test coverage
- Run `pnpm run check` + `pnpm run test:unit`
- Verify in browser: fill the new question → see it affect the result page

#### STEP 3: Add new pages for seller profile and project approval

Only AFTER Step 2 is complete and verified:

- Add `sellerProfile_homeLoan` page (4 questions from design doc)
- Add `projectApproval_homeLoan` page (3 questions from design doc)
- Wire each to rule engine (lender filtering based on projectApprovedLenders, transaction complexity scoring)

#### STEP 4: Add applicant stability and credit behavior pages

- Add `applicantStability_homeLoan` (4 questions)
- Add `creditBehavior_homeLoan` (4 questions)
- Wire to Dim 4, 5, 7, 8 scoring in rule engine

#### STEP 5: Graduate existing binary questions (LAST)

Only after everything above is working:

- Replace `purchaseType` with `transactionNature` (preserving backward compat via flagKey)
- Replace binary legal questions with graduated versions
- Remove redundant questions

---

### RULES (NON-NEGOTIABLE)

1. **Results must improve before form changes** — Every new question must be wired end-to-end (form → payload → enricher → engine → result builder → UI) before the next question is added.

2. **Never remove existing questions until replacement is proven** — Add the graduated version alongside the binary one first. Only remove the binary one after verifying the graduated version works end-to-end AND the old one is truly redundant.

3. **Never restructure pages without explicit user approval** — Adding a question to an existing page is fine. Moving questions between pages, creating new pages, renaming pages, changing page order — all need explicit approval first.

4. **Both schema copies must stay in sync** — `src/lib/config/homeLoanSchema.json` AND `src/lib/server/formEngine/schemas/homeLoanSchema.json`. Always modify both atomically.

5. **Test after every change** — `pnpm run check` (0 errors, 0 warnings) + `pnpm run test:unit` (6,971+ tests pass). No exceptions.

6. **Show your work in the browser** — After each step, verify in the running app that the result page actually shows better output. Screenshots or describe what changed.

7. **Update docs after each step** — Mark completed items in `HOME-LOAN-SCHEMA-DESIGN.md` checklist, update `DEVELOPMENT-PLAN.md`, log to `CHANGELOG.md`.

8. **Small commits** — One commit per step/substep. Don't batch 18 files into one massive change. If something breaks, it should be easy to revert just that step.

9. **Ask before big decisions** — If you're unsure whether something should be replaced vs. kept alongside, ASK. Don't assume.

10. **Read the "Policy vs Reality" intent** — The user wants a system that tells DSAs "will this lender's credit manager actually approve this file?" not just "does this meet stated policy?" Every change must serve this goal.

11. **Full-stack key alignment when merging questions/options** — When questions are merged (e.g., 3 binary Yes/No → 1 graduated with 4 options) or options are consolidated, the keys and properties MUST be traced and updated across EVERY layer. No orphaned references, no broken chains. The full chain is:

    ```
    Schema JSON (contextKey, bindsTo, flagKey, showWhen references)
      → Form Engine (engine.ts: buildCombinedAnswers, visibility.ts: showWhen evaluation)
      → Client rendering (+page.svelte: updateAnswer, visibleQuestions, combinedAnswers)
      → Session storage (formState.loanData keys)
      → Payload Builder (types.ts field definitions, loanTransaction.ts / applicantPayload.ts extraction)
      → Payload Enricher (payloadEnricher.ts: _computed.* fields derived from these keys)
      → Rule Engine (evaluationEngine.ts: JSON-Logic rules referencing var paths)
      → Bank Rule Docs (realBankRuleDocs.ts: per-lender rules referencing field names)
      → Result Builder (resultBuilder.ts: factors, suggestions, approval_probability)
      → Discomfort Analyzer (discomfortAnalyzer.ts: zone detection using these fields)
      → Lender Results UI (LenderResultCard.svelte, DecisionFactorsPanel, etc.)
      → Database (MongoDB documents storing form snapshots with these keys)
      → Tests (all test files referencing question IDs, contextKeys, page IDs, payload fields)
    ```

    **Before merging any question**: Grep the entire codebase for the old key names. Every reference must be updated or have backward-compatible mapping. Use `payloadEnricher.ts` for backward-compat bridging (e.g., if `ownershipChainComplete` is absorbed into `titleClarity`, the enricher must derive the old field from the new one so existing rules still work).

    **Checklist for each merged question:**
    - [ ] Old contextKey → new contextKey mapping documented
    - [ ] Old option values → new option values mapping documented
    - [ ] All showWhen conditions across ALL pages referencing old key updated
    - [ ] flagKey entries producing old key values updated or bridged
    - [ ] Payload types updated (both old field kept as optional + new field added)
    - [ ] Payload extraction updated (extract from new key, bridge to old key)
    - [ ] Enricher bridges old→new for any existing JSON-Logic rules
    - [ ] All test fixtures and assertions updated
    - [ ] Verified: `pnpm run check` + `pnpm run test:unit` pass
    - [ ] Verified: existing rule engine output unchanged for same-meaning inputs

---

### KEY FILES TO READ BEFORE STARTING

| File                                               | Why                                                        |
| -------------------------------------------------- | ---------------------------------------------------------- |
| `src/lib/ruleEngine/evaluationEngine.ts`           | The 9-stage pipeline — understand before modifying         |
| `src/lib/ruleEngine/payloadEnricher.ts`            | Where `_computed.*` fields are added — Step 1 starts here  |
| `src/lib/ruleEngine/resultBuilder.ts`              | What the result page displays — must show new intelligence |
| `src/lib/ruleEngine/discomfortAnalyzer.ts`         | DSA coaching output — enhance with risk signals            |
| `src/lib/ruleEngine/systemConfig.ts`               | Centralized config — risk weights go here                  |
| `src/lib/types/lenderResults.ts`                   | Output types — need new risk fields                        |
| `src/lib/config/homeLoanSchema.json`               | Current 14-page schema — read thoroughly before touching   |
| `src/lib/utils/payloadBuilder/types.ts`            | Payload types — new fields added here                      |
| `src/lib/utils/payloadBuilder/loanTransaction.ts`  | Loan-level field extraction                                |
| `src/lib/utils/payloadBuilder/applicantPayload.ts` | Applicant-level field extraction                           |

### FULL-STACK FILES TO CHECK WHEN ANY KEY CHANGES

When merging or modifying a question's contextKey, bindsTo, or option values, grep for the old key in ALL of these:

| Layer                    | Files                                                                                          | What to check                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Schema**               | `src/lib/config/homeLoanSchema.json`, `src/lib/server/formEngine/schemas/homeLoanSchema.json`  | contextKey, bindsTo_template, showWhen `{"var":"key"}` references, flagKey entries |
| **Form Engine (server)** | `src/lib/server/formEngine/engine.ts`, `visibility.ts`, `optionResolver.ts`, `textResolver.ts` | Any hardcoded key references                                                       |
| **Form Engine (client)** | `src/lib/config/showWhenEngine.ts`                                                             | Client-side showWhen evaluation                                                    |
| **Form Pages**           | `src/routes/(app)/form/home-loan/+page.svelte`                                                 | `updateAnswer` special cases, `combinedAnswers`, BT_TOPUP_PAGE_ORDER               |
| **Form Helpers**         | `src/lib/form/homeLoan/visibility.ts`, `src/lib/form/firstPage/visibilty.ts`                   | Page flow arrays, visibility logic                                                 |
| **Payload Builder**      | `src/lib/utils/payloadBuilder/types.ts`, `loanTransaction.ts`, `applicantPayload.ts`           | Type definitions, extraction logic                                                 |
| **Payload Grouping**     | `src/lib/utils/payloadGrouping.ts`                                                             | Page-to-group mappings                                                             |
| **Payload Enricher**     | `src/lib/ruleEngine/payloadEnricher.ts`                                                        | `_computed.*` derivations, backward-compat bridges                                 |
| **Rule Engine**          | `src/lib/ruleEngine/evaluationEngine.ts`, `incomeAssessor.ts`, `emiCalculator.ts`              | JSON-Logic var paths, hardcoded field references                                   |
| **Bank Rules**           | `src/lib/ruleEngine/realBankRuleDocs.ts`                                                       | Per-lender rule definitions referencing field names                                |
| **Result Builder**       | `src/lib/ruleEngine/resultBuilder.ts`                                                          | Factor generation, suggestion text, approval_probability inputs                    |
| **Discomfort Analyzer**  | `src/lib/ruleEngine/discomfortAnalyzer.ts`                                                     | Zone detectors referencing field values                                            |
| **System Config**        | `src/lib/ruleEngine/systemConfig.ts`                                                           | Weight configs, threshold configs                                                  |
| **Lender Results Types** | `src/lib/types/lenderResults.ts`, `src/lib/types/ruleArtifact.ts`                              | Output type definitions                                                            |
| **Wizard Sidebar**       | `src/lib/config/wizardSections/homeLoan.ts`                                                    | Section→page mapping for sidebar navigation                                        |
| **Tests**                | `src/lib/testing/homeLoan/pageFlowMap.ts`, all `__tests__/*.test.ts`, `e2e/homeLoan.setup.ts`  | PAGE_IDS, QUESTIONS_BY_PAGE, flow sequences, fixtures                              |
| **Database**             | Existing MongoDB documents                                                                     | Form snapshots may have old keys — enricher must bridge                            |

---

### CURRENT STATE

- **Branch**: `main` (only branch, never switch)
- **Schema**: 14 pages, original stable structure (no restructure applied)
- **Tests**: 6,971 passing across 55 files
- **Type check**: 0 errors, 0 warnings
- **flagKey bugfix**: Applied in `engine.ts` and `+page.svelte` (committed)
- **Design docs**: Both in `docs/` (committed)

Start with Step 1. Do not ask to proceed to Step 2 until Step 1 is verified working.
