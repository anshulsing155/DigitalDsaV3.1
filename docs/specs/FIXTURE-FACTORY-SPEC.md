# Fixture Factory — Spec (S77e)

> **Status:** OUTLINE — awaiting Prashant's review of structure before deepening sections.
> Once structure is approved, each section gets filled in and signed off one at a time.

---

## Reading order

1. This spec (you are here)
2. `docs/NEXT-SESSION-PROMPT.md` § S77e — mission, sequencing, definition of done
3. `docs/SESSION-HANDOFF.md` → S77d Phase 1.6 block — context of what we ship on top of

---

## 1. Context & motivation (WHY)

### The real-user picture

A DSA opens the Home Loan form, marks the applicant salaried, picks a
ready-to-move flat in Bangalore, fills six pages, then walks through
co-applicant + obligations + income profile. At submission, ~120 answer
keys land in `formState.loanData['Home Loan']` + `formState.applicants[i]`.
Every one of those keys has a schema question behind it, and any required
question not answered is a potential rule-engine surprise at evaluation
time.

### What the fixtures claim that journey looks like

Our 25 curated fixtures (`HL-NEW-SAL-CLEAN` and friends) are hand-built
snapshots of what a completed journey *should* look like. They were
correct on the day they were authored. Since then the schema has grown —
new required questions, new option values, reshuffled groupings — and
nobody rewalked all 25 hand-built payloads to catch up. The fixtures
don't know about the schema, so they can't self-heal.

### Why the drift matters now

`formGapReport.test.ts` measures the gap directly. Current baseline:
**22% average required-question coverage** across the 25 scenarios,
**~2,287 required questions unanswered**. That means our rule-engine
tests, the 500-profile synthetic generator (seeded into
`LenderRuleFixtures` + rehydrated by the admin Policy Engine), and the
new S77d Phase 1.6 server-folded-parity tests are all evaluating against
payloads that look like a DSA who forgot three-quarters of the form. When
the rule engine passes on a stale fixture, that's not a correctness
signal — it's the engine shrugging at a payload it can't read.

Consumers already affected:
- `evaluationEngine.test.ts` / `integrationTests.test.ts` /
  `realBankIntegrationTests.test.ts` — exercising policy rules against
  under-populated payloads.
- `syntheticGenerator.test.ts` + its 500-profile output — seeded into
  production-adjacent collections via `seedPolicyEngine.ts` +
  `/api/admin/policy-engine/seed/+server.ts`.
- `evaluateAndPersistFilter.test.ts` (S77d, 9 tests) — currently using
  throwaway inline fixtures because we already knew the fixture
  infrastructure couldn't be trusted.

### What the factory changes

Fixtures become *derived*, not parallel. Each of the 25 curated scenarios
becomes a small selector config ("Home Loan, salaried, RTM flat, couple,
CIBIL 780, no obligations"). The factory walks the live schema via the
loan-type composer and fills every required slot, drawing realistic
values from the retained data pools (city/name/income/obligation/
entityName/incomeEntry — 1,815 LOC already battle-tested). When the
schema adds a new required question, every fixture picks it up on the
next run. No more silent drift.

Staleness (abandoned-branch keys — the very bug S77c/S77d fix) is a
separate, opt-in overlay. Curated scenarios are clean by default; Phase
1.6 regression tests layer staleness on deliberately.

## 2. Public API freeze (WHAT CANNOT BREAK)

Everything listed here is imported by at least one of the 15 downstream
consumers. The rewrite must preserve every identifier with semantically
equivalent output. Table grouped by file.

### 2a. `src/lib/testing/fixtures/fixtureProfiles.ts`

| Export | Kind | Notes |
|---|---|---|
| `fixture01_SalariedClean` … `fixture25_ProfNoOblig` | `LoanApplicationPayload` × 25 | Main curated 25. Each sources from `SCENARIO_BY_ID.get('<ID>')!.payload`. |
| `fixture02_SalariedWithCarLoan`, `fixture03_SelfEmployedCA`, `fixture04_CashHeavyTrader`, `fixture05_Pensioner`, `fixture06_NRISalaried`, `fixture07_CompanyPvtLtd`, `fixture08_BTCleanTrack`, `fixture09_BTIrregularTrack`, `fixture10_LowCIBILDefault`, `fixture11_HighFOIR`, `fixture12_CoupleJoint`, `fixture13_HighNetWorth`, `fixture14_YoungFirstBuyer`, `fixture15_SeniorPensioner` | aliases × 14 | Back-compat aliases. Each assigned from a main fixture. **Note**: NEXT-SESSION-PROMPT said 10; actual is 14. Preserve all 14. |
| `edge_CIBIL580`, `edge_CIBIL650`, `edge_HighFOIR`, `edge_NRI`, `edge_CompanyPvt`, `edge_3Applicants`, `edge_Age23`, `edge_Age68`, `edge_BTCreditLines`, `edge_ProfLawyerDC`, `edge_GovtSal`, `edge_HighValue` | edge payloads × 12 | Named edge cases. Each sources from `SCENARIO_BY_ID.get('EDGE-*')!.payload`. |
| `ALL_FIXTURES` | `{ name: string; fixture: LoanApplicationPayload }[]` | Iteration surface for `fixtureProfiles.test.ts` + `seedFixtures.ts`. Derived from `ALL_SCENARIOS`. |
| `obligation` | helper function (re-export) | Convenience constructor for `ObligationEntry`. |
| `ObligationEntry` | type re-export | From `$lib/utils/payloadBuilder`. |

**Total surface: 51 named payloads + 1 collection + 1 helper + 1 type = 54 identifiers.**

### 2b. `src/lib/testing/scenarios/formPathScenarios.ts`

| Export | Kind | Notes |
|---|---|---|
| `FormPath` | interface | 5 optional + 1 required field describing the how-can-we-help Q1–Q4 path. |
| `ExpectedFill` | interface | `expectedAsked` / `expectedSkipped` / `expectedPageCount`. |
| `FormPathScenario` | interface | The core scenario shape: `id`, `description`, `formPath`, `expectedRoute`, `payload`, `expectedFill`, `tags`. |
| `ALL_SCENARIOS` | `FormPathScenario[]` | **37 scenarios** (25 main + 12 EDGE). Full ID list below — every one is load-bearing because `fixtureProfiles.ts` calls `SCENARIO_BY_ID.get('<ID>')!` and will throw on any rename. |

**Full scenario-ID freeze (37 IDs, confirmed via grep 2026-04-21):**

<details>
<summary>Main scenarios (25)</summary>

- Home Loan (5): `HL-NEW-SAL-CLEAN`, `HL-NEW-SE-PRO`, `HL-NEW-PENS`, `HL-BT-ONLY`, `HL-BT-TOPUP`, `HL-TOPUP`
- LAP (5): `LAP-NEW-TERM`, `LAP-DOD-NEW`, `LAP-BT-TERM`, `LAP-BT-TOPUP`, `LAP-TOPUP-TERM`
- Plot (5): `PLOT-ONLY`, `PLOT-CONSTRUCTION`, `PLOT-CONSTRUCTION-ONLY`, `PLOT-EQUITY`, `PLOT-BT`
- Personal (3): `PL-FRESH-YES-OBLIG`, `PL-CONSOL`, `PL-NO-OBLIG`
- Business (3): `BL-FRESH-YES-OBLIG`, `BL-CONSOL`, `BL-NO-OBLIG`
- Professional (3): `PROF-FRESH-YES-OBLIG`, `PROF-CONSOL`, `PROF-NO-OBLIG`
</details>

<details>
<summary>EDGE scenarios (12)</summary>

`EDGE-CIBIL-580`, `EDGE-CIBIL-650`, `EDGE-HIGH-FOIR`, `EDGE-NRI`, `EDGE-COMPANY-PVT`, `EDGE-3-APPLICANTS`, `EDGE-AGE-23`, `EDGE-AGE-68`, `EDGE-BT-CREDIT-LINES`, `EDGE-PROF-LAWYER-DC`, `EDGE-GOVT-SAL`, `EDGE-HIGH-VALUE`
</details>
| `SCENARIO_BY_ID` | `Map<string, FormPathScenario>` | ID → scenario lookup. Consumed by `fixtureProfiles.ts`. |
| `getScenariosByTag(tag)` | function | Tag filter. |
| `getScenariosByLoanName(loanName)` | function | Loan-name filter. |
| `obligation` | helper function (named export) | **Source of truth**; `fixtureProfiles.ts` re-exports. |

### 2c. `src/lib/testing/generators/syntheticGenerator.ts`

| Export | Kind | Notes |
|---|---|---|
| `GeneratedProfile` | interface | `profile_id`, `loan_type`, `description`, `payload`, `metadata{employment_type, applicant_count, tags}`. |
| `generateAllProfiles(seed?: number)` | function | Deterministic 500-profile generator. Default seed `42`. **Output shape + ordering must be snapshot-stable** (consumers downstream snapshot-assert; determinism is load-bearing for the admin seed endpoint). |

### 2d. `src/lib/testing/scenarios/formPathAuditor.ts`

Keep *all* public surface — internals may call the new factory but the
export shape is load-bearing for `formGapReport.test.ts` (our drift
meter) and `reverseSchemaMap.test.ts`.

| Export | Kind |
|---|---|
| `FormPathEntry` | interface |
| `AuditResult` | interface |
| `ScenarioGapReport` | interface |
| `ALL_FORM_PATHS` | `FormPathEntry[]` (21 known working paths) |
| `auditFormPaths()` | function |
| `generateGapReport(scenario)` | function |
| `generateFullGapReport(scenarios)` | function |
| `getValidFormPathCombinations()` | function |

### 2e. `src/lib/testing/fixtures/seedFixtures.ts`

Consumed by production-adjacent code (`/api/admin/seed`, admin UI).
Preserve everything.

| Export | Kind |
|---|---|
| `seedFixtureProfiles()` | async function |
| `seedLenderEntries()` | async function |
| `seedAll()` | async function |
| `SeedResult` | interface |

### 2f. What is **NOT** part of the freeze

- `archetypeTemplates.ts` — `ArchetypeTemplate` interface + `ALL_ARCHETYPES`
  constant + per-loan `*_ARCHETYPES` arrays. Currently consumed only by
  `syntheticGenerator.ts` + `archetypeHelpers.ts`. Both get rewired, file
  gets **archived** to `src/lib/testing/generators/_archive/archetypes/`
  (CLAUDE.md archive-never-delete policy retained).
- `archetypeHelpers.ts` — `SeededRandom` interface + `buildSalariedProfile`,
  `buildGovernmentProfile`, `buildLoanTransaction`, `buildApplicant` and
  ~15 other builders. Consumed only by `syntheticGenerator.ts`.
  Rewired + archived alongside `archetypeTemplates.ts`.

### 2g. Confirmation sweep before implementation

Run once pre-code-change:

```bash
git grep -n "^export " src/lib/testing/fixtures/ src/lib/testing/scenarios/ src/lib/testing/generators/ | grep -v '_archive/'
```

Cross-check output against this table. Any export in output that's not
here = missed-freeze candidate, must be added to the table.

## 2. Public API freeze (WHAT CANNOT BREAK)

The list of exports that 15 downstream files depend on today. Anything on this list must survive the rewrite with equivalent semantics. To be filled in from `grep ^export` pass already completed + one confirmation sweep across `src/` before implementation.

Categories expected: `fixtureProfiles.ts` (25 named fixtures + 10 aliases + 12 edge_* + `ALL_FIXTURES` + `obligation` re-export + `ObligationEntry` type re-export), `formPathScenarios.ts` (`FormPath` + `ExpectedFill` + `FormPathScenario` types + `ALL_SCENARIOS` + `SCENARIO_BY_ID` + `getScenariosByTag` + `getScenariosByLoanName` + `obligation`), `syntheticGenerator.ts` (`GeneratedProfile` + `generateAllProfiles`), `formPathAuditor.ts` (all 6 helper functions + 3 types + `ALL_FORM_PATHS`), `seedFixtures.ts` (`seedFixtureProfiles` + `seedLenderEntries` + `seedAll` + `SeedResult`).

## 3. Architecture — journey-based model (HOW)

### Core idea

A fixture is a **recorded DSA session**, not a photocopied end-state. Each
scenario is declared as an ordered list of steps — "open how-can-we-help,
answer these questions; open loan-requirement, fill these fields; add
this applicant; add co-applicant; submit". The factory plays the journey
through a pure-TS form-engine harness that reuses the real
`visibility.ts` for showWhen evaluation. Whatever state the harness
produces IS the fixture payload.

This gives us four properties we can't get from a state-based factory:

1. **Reachability by construction** — every fixture is the end-state of
   a concrete user path. If the form changes so the path is no longer
   reachable (new required page inserted, option removed), the journey
   breaks loudly. Correct coupling.
2. **Natural staleness modelling** — a journey that switches branches
   mid-flow (salaried → self-employed → salaried) naturally accumulates
   stale keys from the abandoned branches, exactly mirroring the bug
   S77c/S77d fix. No separate staleness-injector API needed.
3. **Single source of truth for visibility** — the factory calls
   `isQuestionVisible()` from `$lib/server/formEngine/visibility.ts`.
   Zero risk of two showWhen implementations drifting (CLAUDE.md
   Pitfall #1 territory if we re-implemented).
4. **Deterministic + seeded** — journeys declare their own seed. Data
   pool picks are deterministic given the seed + step ordinal. Same
   seed → same end-state.

**NOTE on earlier decisions:** the "composable staleness overlay"
choice locked in §3-outline is **superseded** by this model. Branch
switches become journey steps; we don't need `withStaleBranch()` /
`withStaleObligations()` / `withStaleIncomeEntries()` as separate
exports. Regression tests compose staleness by writing journeys that
include switches.

### Schema-import posture (unchanged)

The harness imports the **six composer functions directly**, not
`schemaLoader.ts`:

```ts
import { composeHomeLoanSchema } from '$lib/config/homeLoan/composer.js';
import { composeLapLoanSchema } from '$lib/config/lapLoan/composer.js';
import { composePlotLoanSchema } from '$lib/config/plotLoan/composer.js';
import { composePersonalLoanSchema } from '$lib/config/personalLoan/composer.js';
import { composeBusinessLoanSchema } from '$lib/config/businessLoan/composer.js';
import { composeProfessionalLoanSchema } from '$lib/config/professionalLoan/composer.js';
```

**Why this path:**
- Composers are pure TS (`grep '$lib/server' src/lib/config/` returns
  zero hits). Client-safe, no transitive server imports, no deep-freeze
  pass on each test boot.
- `schemaLoader.ts` adds a deep-freeze cache layer that vitest doesn't
  need (tests want a fresh mutable schema per describe; production wants
  frozen). Using composers directly sidesteps that cost.
- `formPathAuditor.ts` already demonstrates vitest CAN reach
  `$lib/server/*` if needed — so we retain the option for the auditor's
  reverseSchemaMap path, but the factory itself stays composer-only.

### Journey types

Lives in `src/lib/testing/factory/journeyTypes.ts`.

```ts
/** A single step in a DSA's recorded session. */
export type JourneyStep =
  | { kind: 'page'; pageId: string; answers: Record<string, unknown> }
  | { kind: 'add-applicant'; data: ApplicantJourneyData; applicantIndex?: number }
  | { kind: 'submit' };

/**
 * Applicant step data is a shallow key/value map of the fields a DSA
 * would visibly fill in the applicant flow. Subfields like
 * `salariedProfile.*` are derived in the harness from `employmentType`
 * + the applicant sub-schema walk — NOT hand-typed per journey.
 */
export type ApplicantJourneyData = {
  fullName: string;
  age: number;
  cibilScore?: number;
  applicantType: 'Individual' | 'Company';
  employmentType: string;            // maps to salaried/self-employed/pensioner/etc.
  coApplicantRelation?: string;      // spouse / parent / ... (absent = primary)
  grossMonthlyIncome?: number;
  netMonthlyIncome?: number;
  ObligationsRunning?: 'Yes' | 'No';
  isGuarantorOnOtherLoan?: 'Yes' | 'No';
  incomeProfiles?: string[];
  employer?: string;                 // for salaried
  businessTurnover?: number;         // for self-employed
  businessVintage?: string;
  gstRegistrationStatus?: string;
  // ... extensible; see journeyHarness for full list
};

export type Journey = {
  id: string;
  description: string;
  tags: string[];
  seed: number;                      // determinism anchor
  loanName: string;                  // derived but required for payload assembly
  steps: JourneyStep[];
};
```

### Journey declaration DSL

Lives in `src/lib/testing/factory/journeyHarness.ts`. Tiny helpers that
let each journey read like a script:

```ts
export const journey = (config: {...}): Journey => { /* ... */ };
export const page   = (pageId: string, answers: Record<string, unknown>): JourneyStep =>
  ({ kind: 'page', pageId, answers });
export const addApplicant = (data: ApplicantJourneyData): JourneyStep =>
  ({ kind: 'add-applicant', data });
export const submit = (): JourneyStep => ({ kind: 'submit' });
```

Every one of the 37 scenarios is declared as one `journey({...})` call
plus a sequence of `page(...)` / `addApplicant(...)` / `submit()`
entries. See the `HL-NEW-SAL-CLEAN` example further down.

### Journey player (the harness)

Lives in `src/lib/testing/factory/journeyPlayer.ts`. ~200–300 LOC.

**Primary function:**

```ts
export function playJourney(j: Journey): FormEndState;

type FormEndState = {
  loanData: Record<string, Record<string, unknown>>;  // keyed by loanName
  applicationData: Record<string, unknown>;
  applicants: Record<string, unknown>[];
};
```

**How it runs:**

1. Load the composer's schema for `journey.loanName`.
2. Initialise empty `FormEndState` with seed-driven RNG.
3. For each step:
   - **`page`**: look up `page` in the composed schema; for each entry
     in `step.answers`, find the matching `bindsTo` question;
     call `isQuestionVisible(question, currentState.loanData)` — if
     visible, commit the answer to `state.loanData[loanName][bindsTo]`;
     otherwise drop silently (matches real form behaviour).
   - **`add-applicant`**: walk the applicant sub-schemas
     (`applicantBasicDetails.json` + `salariedQuestion.json` /
     `businessQuestions.json` / etc. — chosen by `data.employmentType`).
     Populate required fields from `data` directly; derive subfield
     shapes (`salariedProfile.*`, `governmentProfile.*`) from the
     retained data pools using the journey seed + applicant index as
     the deterministic anchor. Push the result into `state.applicants`.
   - **`submit`**: run any final validations (doesn't mutate state;
     throws if journey is invalid — caught by the player and reported
     as a journey-authoring bug).

**What the harness does NOT simulate:**

- Svelte 5 reactivity (`$state`, `$derived`, `$effect`) — journeys
  commit answers directly, no intermediate UI render.
- `applicantFormManager.svelte.ts` cross-company matching /
  dedup — the journey asserts the final applicants array directly. If
  tests need to exercise that logic, they should call
  `commitDirectorsToApplicants()` in isolation (existing unit-test
  path, unrelated to fixtures).
- Mobile vs desktop rendering differences — irrelevant.
- Persistence (MongoDB, localStorage) — journeys produce in-memory
  state only; downstream consumers that need persisted shape wrap with
  their own adapters.

**Key imports:**

```ts
import { isQuestionVisible } from '$lib/server/formEngine/visibility.js';
import { composeHomeLoanSchema, composeLapLoanSchema, /* 4 more */ }
  from '$lib/config/...';
import applicantBasicDetails from '$lib/config/applicantBasicDetails.json';
import salariedQuestion from '$lib/config/salariedQuestion.json';
// ... other applicant sub-schemas
```

`visibility.ts` has a `logger` import from `$lib/server/logger.js` —
benign in vitest (pino logs to stdout; already proven OK by
`formPathAuditor.ts`).

### Payload assembly

Lives in `src/lib/testing/factory/payloadAssembler.ts`.

```ts
export function toLoanApplicationPayload(endState: FormEndState): LoanApplicationPayload;
```

Converts the harness's `FormEndState` into the existing
`LoanApplicationPayload` shape (via the canonical
`buildLoanPayload(view.loanAnswers, view.applicants, ...)` codepath, so
the factory's output is literally the same shape as the real submission
pipeline produces). This keeps `fixtureProfiles.ts`' 51 identifiers
typed as `LoanApplicationPayload` and preserves every consumer contract.

### Data pool reuse

The retained 7 data pool files (1,815 LOC in §4c) are **called from the
harness + payload assembler, not from the journey declaration**. A
journey says `{ fullName: 'Rahul Kumar', age: 32 }` with specific
values when realism matters; where determinism from seed is fine, the
journey can say `{ fullName: fromPool('names', 'indian-male'), age: 32 }`
using pool-backed helpers exposed by `journeyHarness.ts`:

```ts
export const fromPool: <T>(pool: PoolName, hint?: string) => T;
```

This keeps the 500-profile synthetic generator tractable (§5) —
`generateAllProfiles()` creates 500 journey variants by mutating
pool-backed fields per seed, replays each through the player.

### Worked example — `HL-NEW-SAL-CLEAN`

See the "Concrete journey-based example" provided in-chat during spec
sign-off (2026-04-21). To be pasted here verbatim once §4's file paths
are finalised; the example already shows:
- The `journey({...})` declaration with steps for how-can-we-help,
  loan-requirement, primary applicant, co-applicant, submit.
- The harness usage: `toPayload(playJourney(HL_NEW_SAL_CLEAN))`
  producing the `LoanApplicationPayload` that `fixtureProfiles.ts` re-exports.
- The branch-switch staleness variant: composing a journey that
  switches employment-type mid-flow, no separate injector API.

### Factory public surface

Lives in `src/lib/testing/factory/schemaFixtureFactory.ts` — the single
named entry point for external consumers.

```ts
// Declaration DSL
export { journey, page, addApplicant, submit, fromPool } from './journeyHarness.js';

// Types
export type { Journey, JourneyStep, ApplicantJourneyData, FormEndState } from './journeyTypes.js';

// Player + assembly
export { playJourney } from './journeyPlayer.js';
export { toLoanApplicationPayload } from './payloadAssembler.js';

// Convenience: one-shot journey → scenario
export function toScenario(j: Journey, extra: {
  formPath: FormPath;
  expectedRoute: string;
  expectedFill: ExpectedFill;
}): FormPathScenario;
```

`toScenario(journey, extra)` is the drop-in used by
`formPathScenarios.ts` — each of the 37 curated entries becomes:

```ts
const HL_NEW_SAL_CLEAN_SCENARIO = toScenario(HL_NEW_SAL_CLEAN, {
  formPath: { q1_loanName: 'Home Loan', q4_loanType: 'New Loan' },
  expectedRoute: '/form/home-loan',
  expectedFill: { /* computed or hand-specified */ },
});
```

## 4. File-by-file plan

### 4a. New files (factory internals) — `src/lib/testing/factory/`

| File | LOC budget | Purpose | Key imports | Key exports |
|---|---|---|---|---|
| `journeyTypes.ts` | ~80 | Pure type definitions for the journey model | none | `Journey`, `JourneyStep`, `ApplicantJourneyData`, `FormEndState` |
| `journeyHarness.ts` | ~120 | DSL helpers — how journeys are written | `journeyTypes` | `journey()`, `page()`, `addApplicant()`, `submit()`, `fromPool()` |
| `journeyPlayer.ts` | ~250 | The engine that plays a journey through visibility.ts and produces FormEndState | composers (6), applicant JSON sub-schemas, `visibility.ts`, dataPools | `playJourney(j)` |
| `payloadAssembler.ts` | ~100 | Converts FormEndState → LoanApplicationPayload via buildLoanPayload | `buildLoanPayload`, `journeyTypes` | `toLoanApplicationPayload(endState)` |
| `schemaFixtureFactory.ts` | ~60 | Barrel — single import point for consumers | all of the above | re-exports + `toScenario(journey, extra)` |

**Total new factory internals: ~610 LOC.**

### 4b. Journey declarations — `src/lib/testing/factory/journeys/`

One file per loan type; EDGE scenarios land in whichever file their
anchor loan type dictates. If an EDGE case spans loan types, create an
`edgeCases.ts` during implementation.

| File | LOC budget | Scenarios |
|---|---|---|
| `journeys/homeLoan.ts` | ~400 | `HL-NEW-SAL-CLEAN`, `HL-NEW-SE-PRO`, `HL-NEW-PENS`, `HL-BT-ONLY`, `HL-BT-TOPUP`, `HL-TOPUP` + any EDGE-* anchored to Home Loan |
| `journeys/lapLoan.ts` | ~350 | `LAP-NEW-TERM`, `LAP-DOD-NEW`, `LAP-BT-TERM`, `LAP-BT-TOPUP`, `LAP-TOPUP-TERM` + EDGE-* |
| `journeys/plotLoan.ts` | ~350 | `PLOT-ONLY`, `PLOT-CONSTRUCTION`, `PLOT-CONSTRUCTION-ONLY`, `PLOT-EQUITY`, `PLOT-BT` + EDGE-* |
| `journeys/personalLoan.ts` | ~250 | `PL-FRESH-YES-OBLIG`, `PL-CONSOL`, `PL-NO-OBLIG` + EDGE-* |
| `journeys/businessLoan.ts` | ~250 | `BL-FRESH-YES-OBLIG`, `BL-CONSOL`, `BL-NO-OBLIG` + EDGE-* |
| `journeys/professionalLoan.ts` | ~250 | `PROF-FRESH-YES-OBLIG`, `PROF-CONSOL`, `PROF-NO-OBLIG` + EDGE-* |
| `journeys/edgeCases.ts` (optional) | ~200 | Fallback for EDGE scenarios that don't naturally anchor to one loan type |
| `journeys/index.ts` | ~30 | Re-export every journey for `formPathScenarios.ts` consumption |

**Total journey declarations: ~1,850–2,100 LOC across 7–8 files.**
Replaces the 3,975 LOC in current `formPathScenarios.ts` (48% reduction)
because:
- Journey steps are declarative, not the 100+ hand-populated answer
  keys per scenario.
- Applicant subfield populations (`salariedProfile.*`,
  `governmentProfile.*`) move to the player, not inline per scenario.
- Data pool picks become `fromPool()` references, not literal city
  names / loan amounts per scenario.

### 4c. Rewritten in place — public names survive (drop-in)

| File | Current LOC | New LOC | What changes |
|---|---|---|---|
| `src/lib/testing/fixtures/fixtureProfiles.ts` | 194 | ~180 | Body unchanged in spirit — still re-exports from `SCENARIO_BY_ID`. The 51 identifiers + `ALL_FIXTURES` + `obligation` + `ObligationEntry` survive verbatim. |
| `src/lib/testing/scenarios/formPathScenarios.ts` | 3,975 | ~500 | Body replaced — imports from `journeys/index.ts`, wraps each with `toScenario(journey, extra)`, builds `ALL_SCENARIOS` + `SCENARIO_BY_ID` + helper functions. Types (`FormPath`, `ExpectedFill`, `FormPathScenario`) stay here as the canonical definitions. |
| `src/lib/testing/generators/syntheticGenerator.ts` | 162 | ~180 | Body replaced — imports journeys, seeded variation generator produces 500 profiles by mutating pool-backed fields per seed, replays each via `playJourney`. `SeededRandom` class stays. `generateAllProfiles(seed)` signature unchanged. |
| `src/lib/testing/fixtures/seedFixtures.ts` | 240 | ~240 | **Unchanged** — already consumes `ALL_FIXTURES` + `seedSynthetics`; the upstream rewrites are transparent. |
| `src/lib/testing/scenarios/formPathAuditor.ts` | 566 | ~400 | Public API survives (`ALL_FORM_PATHS`, `auditFormPaths`, `generateGapReport`, `generateFullGapReport`, `getValidFormPathCombinations`). Internal: now audits journeys (which it can play to introspect which questions are actually visible for a path) rather than scraping answers directly — a cleaner implementation. |

**Net LOC change for rewritten files: ~3,137 → ~1,500 (52% reduction).**

### 4d. Retained unchanged — `src/lib/testing/generators/dataPools/`

Pools are the vocabulary the factory draws from. 1,815 LOC total,
retained verbatim. Called from `journeyPlayer.ts` + `payloadAssembler.ts`
via `fromPool()` hooks.

| File | LOC |
|---|---|
| `cityPool.ts` | 382 |
| `namePool.ts` | 170 |
| `incomePool.ts` | 70 |
| `obligationPool.ts` | 215 |
| `entityNamePool.ts` | 290 |
| `incomeEntryPool.ts` | 495 |
| `conditionalFieldEnforcer.ts` | 193 |
| **Total retained** | **1,815** |

### 4e. Archived (NOT deleted) — `src/lib/testing/generators/_archive/archetypes/`

CLAUDE.md archive-never-delete policy applies. Files move to a new
`_archive/` sibling of `archetypes/`; the now-empty `archetypes/`
directory gets removed via `rmdir`. `tsconfig.json` already excludes
`**/_archive/**`, so archived code does not participate in compilation
but remains restorable.

| File | LOC | Destination | Reason |
|---|---|---|---|
| `archetypeTemplates.ts` | 1,850 | `generators/_archive/archetypes/archetypeTemplates.ts` | 88 hand-curated archetype definitions — replaced by schema-walked journeys. |
| `archetypeHelpers.ts` | 844 | `generators/_archive/archetypes/archetypeHelpers.ts` | Per-employment-type builders — behaviour moves into `journeyPlayer.ts` applicant step + `payloadAssembler.ts`. |
| `archetypes/` dir | — | removed via `rmdir` after the two files move. |
| `_archive/README.md` | ~30 (new) | `generators/_archive/README.md` | New README documenting what was archived + why + restore path. Pattern mirrored from `src/lib/stores/_archive/README.md` (S77c precedent). |
| **Total archived** | **2,694 + 30 README** | | |

### Grand totals

| Bucket | LOC (before) | LOC (after) | Delta |
|---|---|---|---|
| Factory internals | 0 | ~610 | +610 |
| Journey declarations | 0 | ~2,000 | +2,000 |
| Rewritten in place | 5,137 | ~1,500 | **−3,637** |
| Retained data pools | 1,815 | 1,815 | 0 |
| Archetype system (archived to `_archive/`) | 2,694 | 0 (excluded from tsc) | **−2,694** |
| **Net** | **9,646** | **~5,925** | **−3,721 LOC (−38%)** |

Net contraction of 3,721 LOC with dramatically better schema fidelity
and a reusable pure-TS form-engine harness.

## 5. Consumer migration map (16 rows, ordered low → high risk)

> **Drift note vs. NEXT-SESSION-PROMPT.** The briefing said "15 consumers"; actual grep found **12 true external consumers + 4 fixture-system-internal files** (rewritten in place, not migrated). Listing all 16 for completeness so nothing slips silently.

Columns: **#** = migration order · **file** · **category** · **current surface** · **new surface** · **risk** (L/M/H) · **shift-note hypothesis** (populated during implementation; empty = "assumed drop-in").

Migration order: **low → med → high**. Rewrites first (so the factory's outputs stabilise), then production-adjacent paths (no test coverage to catch regressions — highest cost if wrong, but behaviour is fully observable in one call), then vitest tests sorted by assertion-surface narrowness, with Phase 1.6 (`evaluateAndPersistFilter.test.ts`) absolutely last because it's the only consumer getting a **new** import surface (inline throwaway fixtures → factory calls).

### 5a. Fixture-system-internal rewrites (rows 1–4)

These four files are not "migrated" — they are the refactor. They land together as a single commit-ready unit so the public exports never break between commits.

| # | File | Category | Current | New | Risk | Shift-note hypothesis |
|---|---|---|---|---|---|---|
| 1 | `src/lib/testing/scenarios/formPathScenarios.ts` | internal-rewrite | Hand-authored `ALL_SCENARIOS` + `SCENARIO_BY_ID` (3,975 LOC) | Journey declarations imported from `journeys/{loanType}.ts`; `toScenario()` assembler at module scope (~500 LOC) | L | Public API identical (same 37 IDs, same `FormPathScenario` shape). Snapshot-diff `HL-NEW-SAL-CLEAN` pre/post to confirm. |
| 2 | `src/lib/testing/fixtures/fixtureProfiles.ts` | internal-rewrite | 51 named exports wrapping `SCENARIO_BY_ID` lookups (194 LOC) | Same 51 names, same payload shapes, same `ALL_FIXTURES` barrel (~180 LOC) | L | Named re-exports must stay byte-identical in signature. One snapshot test per loan type (6 total) gates this. |
| 3 | `src/lib/testing/generators/syntheticGenerator.ts` | internal-rewrite | `generateAllProfiles(seed=42)` via `ALL_ARCHETYPES` + archetype builders (162 LOC) | Same signature, same seed, sources from schema-walked journey pool (~180 LOC) | M | **Deterministic hash WILL change** — archetype builders produced different applicant shapes than schema walks. Snapshot hash pre-refactor; update assertion + document new hash in shift note. See Failure Mode #3 in §7. |
| 4 | `src/lib/testing/scenarios/formPathAuditor.ts` | internal-rewrite | Reads `FormPathScenario[]` from step 1 (566 LOC) | Same reader surface, internal logic simplified once journey metadata is available (~400 LOC) | L | Public API stable (`auditFormPaths`, `generateGapReport`, `ALL_FORM_PATHS`). Gap-report coverage % may shift — see row 10. |

### 5b. Production-adjacent, non-test paths (rows 5–6)

No vitest assertions guard these — correctness is observed at runtime via admin API output / rule-engine evaluation. Migrate **after** rewrites are stable so we're not chasing moving targets.

| # | File | Category | Current | New | Risk | Shift-note hypothesis |
|---|---|---|---|---|---|---|
| 5 | `src/lib/server/testing/syntheticProfiles.ts` | production-adjacent | `import { generateAllProfiles } from '$lib/testing/generators/syntheticGenerator.js'` | **Identical import.** Signature preserved. | L | Drop-in. Runtime sanity-check: call from admin dashboard, verify 500 profiles render without schema-mismatch errors. |
| 6 | `src/routes/api/admin/policies/seed/+server.ts` | admin API | `import { seedAll } from '$lib/testing/fixtures/seedFixtures.js'` | **Identical import.** `seedFixtures.ts` is unchanged; only its dependency (`fixtureProfiles.ts`) is rewritten underneath. | L | `LenderRuleFixtures` collection documents must still upsert by `fixture_id`; verify `ALL_FIXTURES` ordering + naming unchanged. |

### 5c. Vitest tests — narrow assertion surface (rows 7–10)

These tests care about structural properties (counts, shapes, visibility logic) rather than specific numeric payloads. Fastest to migrate, highest signal-to-noise when something regresses.

| # | File | Category | Current | New | Risk | Shift-note hypothesis |
|---|---|---|---|---|---|---|
| 7 | `src/lib/testing/__tests__/formPathAuditor.test.ts` | test | `$lib/testing/scenarios/formPathAuditor.js` | **Identical import.** | L | Assumed drop-in. Auditor contract unchanged. |
| 8 | `src/lib/testing/__tests__/syntheticGenerator.test.ts` | test | `$lib/testing/generators/syntheticGenerator.js` **+** `$lib/testing/generators/archetypes/archetypeTemplates.js` | `syntheticGenerator.js` stays; archetype import **dies** — replace with journey-pool metadata import from `journeys/index.ts`. | M | **Archetype import breaks on archive.** Test rewritten to assert against `journeys/` pool metadata (archetype count → journey count). Snapshot hash assertion updated (see row 3). |
| 9 | `src/lib/testing/__tests__/generators/generatorCorrections.test.ts` | test | `$lib/testing/generators/syntheticGenerator.js` | **Identical import.** | M | May include assertions that reference legacy archetype quirks (e.g. specific `employmentType` distributions). Re-calibrate assertions to new journey-pool distribution; preserve intent. |
| 10 | `src/lib/testing/__tests__/formGapReport.test.ts` | test | `scenarios/formPathAuditor.js` + `scenarios/formPathScenarios.js` (`ALL_SCENARIOS`) | **Identical imports.** | **M-H** | Known baseline: **22% required-question coverage** (drifted state). Factory should push this **up** (closer to 100% of required questions touched across all 37 scenarios). If coverage regresses, factory is wrong — treat as blocker. Capture pre-refactor baseline hash in the test's comment block for auditability. |

### 5d. Vitest tests — broad assertion surface (rows 11–15)

These tests assert on **specific fixture payloads** (named exports like `fixture01_SalariedClean`). They will produce the most fallout. Migrate sequentially, one-by-one, with shift notes per §6.

| # | File | Category | Current | New | Risk | Shift-note hypothesis |
|---|---|---|---|---|---|---|
| 11 | `src/lib/testing/__tests__/ruleEngine/fixtureProfiles.test.ts` | test | `$lib/testing/fixtures/fixtureProfiles` | **Identical import.** | M | This file is both a test AND a re-export hub for 3 downstream tests (rows 12–14). Keep its `export`s byte-identical (it currently re-exports `fixture01_SalariedClean` etc. for transitive consumption). Assertion fallout expected where rule-engine outputs depend on small shape deltas (e.g. missing `businessVintage` on a salaried profile that schema-walk correctly omits but archetype-builder left as `''`). |
| 12 | `src/lib/testing/__tests__/ruleEngine/evaluationEngine.test.ts` | test | `./fixtureProfiles.test.js` (transitive) | **Identical transitive import.** | M | Rule-engine output diffs expected. Classify each failure per §6 decision tree. |
| 13 | `src/lib/testing/__tests__/ruleEngine/realBankIntegrationTests.test.ts` | test | `./fixtureProfiles.test.js` (transitive) | **Identical transitive import.** | M | Real-bank rule outputs are load-bearing assertions — most likely to reveal fixture-was-wrong cases (schema-walked profile is more correct than archetype-builder output). Document per-bank shift notes. |
| 14 | `src/lib/testing/__tests__/ruleEngine/integrationTests.test.ts` | test | `./fixtureProfiles.test.js` (transitive) | **Identical transitive import.** | M | Same fallout profile as row 13. |
| 15 | `src/lib/testing/__tests__/reverseSchemaMap.test.ts` | test | `./ruleEngine/fixtureProfiles.test` (imports single named fixture) | **Identical transitive import.** | L-M | Only consumes `fixture01_SalariedClean`. Reverse-mapping assertion is narrow — likely drop-in unless the salaried profile's shape changes. |

### 5e. Vitest tests — Phase 1.6 integration (row 16, migrated LAST)

This is the only consumer getting a **new** import surface. Currently uses inline `makeFormState()` + `guarantorOnlyApplicantWithStaleIncome()` helpers (see S77d Phase 1.6 comment block in file). Post-migration: consumes factory-produced scenarios with staleness overlays (via journey branch-switch steps, per §3 v2).

| # | File | Category | Current | New | Risk | Shift-note hypothesis |
|---|---|---|---|---|---|---|
| 16 | `src/lib/testing/__tests__/ruleEngine/evaluateAndPersistFilter.test.ts` | test (Phase 1.6) | Inline THROWAWAY FIXTURES (no factory import) | New imports from `$lib/testing/fixtures/fixtureProfiles` (curated journeys with branch-switch variants for staleness) | **H** | Full rewrite of the `makeFormState()` helper's body. 9 tests: 6-loan breadth sweep + Layer A passthrough + non-mutation + legacy split-array normalization. The 6-loan sweep maps cleanly to 6 curated journeys. The staleness variants become journey steps, not inline mutations. Assertions stay structurally identical (check `buildLoanPayloadSpy.mock.calls[0][1]`). |

### Migration completion criteria

All 16 rows at "completed" with either:
- **No shift note needed** (drop-in, assertion still passes), OR
- **Shift note written** classifying the fallout per §6 and recording the new expected value

At no point between rows 1 and 16 should `pnpm test:unit` total pass count drop by more than **3%** (roughly 210 of ~7,015 tests). A larger drop means the factory has a systemic issue — stop, investigate, don't power through.

## 6. Test fallout policy

Option (a) from S77d — **one-by-one with documented shift notes**. No mass rewrites, no regex-based assertion updates, no "skip.all and revisit". Each failing assertion gets read, classified, and either updated (with a justification) or escalated (because the factory is wrong and must change).

### 6a. Decision tree for every failing assertion

Apply in order — stop at the first match.

```
Assertion fails after migration
    │
    ├─ Q1: Did the archetype builder produce a shape that the
    │      real form cannot produce?
    │      (e.g. `businessVintage: ''` on a salaried applicant —
    │       a schema walk of that applicant's branch never reaches
    │       the businessVintage question because its showWhen
    │       gates on `employmentType === 'self_employed'`.)
    │   │
    │   ├─ YES → classification (i): FIXTURE-WAS-WRONG
    │   │        Update assertion to the schema-correct shape.
    │   │        Shift note explains what the archetype was doing
    │   │        that the schema walk correctly doesn't.
    │   │        → Not a blocker. Migration proceeds.
    │   │
    │   └─ NO  → continue to Q2
    │
    ├─ Q2: Is the factory producing a shape that a real DSA
    │      journey through the UI could not produce either?
    │      (e.g. missing a required answer on a page that every
    │       journey must visit — visibility-gate bug in the
    │       journey player.)
    │   │
    │   ├─ YES → classification (ii): FACTORY-IS-WRONG
    │   │        DO NOT update the assertion. The factory has
    │   │        a bug. Fix the factory, rerun the failing test,
    │   │        re-evaluate. This is a BLOCKER.
    │   │        → Migration pauses until factory is corrected.
    │   │
    │   └─ NO  → continue to Q3
    │
    └─ Q3: Is the assertion load-bearing on a specific
           payload value that neither archetype nor schema walk
           would predict deterministically?
           (e.g. exact `evaluationResult.approvedAmount` —
            rule-engine output that depends on interest-rate
            lookup, deviation recovery, etc.)
        │
        ├─ YES → classification (iii): ASSERTION-SHAPE-IS-LOAD-BEARING
        │        Update the assertion to the new expected value.
        │        Shift note records old + new values + WHY they
        │        differ (which upstream input changed).
        │        → Not a blocker. Migration proceeds.
        │
        └─ NO  → stop. Escalate manually. This is a rare case
                  (the test is asserting on a stable contract that
                  neither source changed) — if we see it, the
                  root cause is probably non-determinism we
                  haven't understood yet.
```

### 6b. Shift-note comment block template

Every classified fallout gets a shift note as a comment block placed **immediately above the affected `it(...)`/`describe(...)` block** in the test file. No separate log file — shift notes live next to the assertions they explain so they survive code moves.

Template (exact shape — copy/paste, don't paraphrase):

```ts
// ─── S77e shift note ─────────────────────────────────────────
// Classification: (i) fixture-was-wrong
// Row #: 12 (ruleEngine/evaluationEngine.test.ts)
// Migrated: 2026-MM-DD
//
// BEFORE (archetype builder):
//   applicant.businessVintage === ''
//
// AFTER (schema-walked journey):
//   applicant.businessVintage === undefined
//
// WHY:
//   `businessVintage` is only visible when employmentType ===
//   'self_employed'. Archetype builder always populated it with
//   ''. Schema walk correctly skips the question on salaried
//   paths, so the key is absent (not empty). Assertion now uses
//   `toBeUndefined()`.
//
//   This is an intended correctness improvement — the rule
//   engine ignores both `''` and `undefined` identically so
//   rule-engine output is unchanged.
// ─────────────────────────────────────────────────────────────
it('salaried applicant: no self-employed fields in payload', () => {
    // ...
});
```

### 6c. Required fields in every shift note

- **Classification** (exact wording: `(i) fixture-was-wrong`, `(ii) factory-is-wrong`, or `(iii) assertion-shape-is-load-bearing`)
- **Row #** from §5 (for traceability back to the migration map)
- **Migrated** date (ISO, `YYYY-MM-DD`)
- **BEFORE** / **AFTER** code snippets (one-liners OK)
- **WHY** — a plain-English reason, not a JSON-Logic trace

### 6d. Escalation rules

- **Any (ii) factory-is-wrong finding pauses migration until fixed.** Do not accumulate factory bugs across multiple rows — that compounds fallout and destroys the one-by-one audit trail.
- **More than 3 (iii) classifications on a single row** means the assertions were testing archetype-builder quirks, not real contracts. Re-read the test's intent; consider whether the test should be rewritten instead of updated.
- **Any (i) classification that affects a rule-engine output** (rows 11–14 in §5) gets a 2-line sanity check: "Would a real DSA's submission produce this same value?" If no, reclassify as (ii).

### 6e. Aggregate shift-note audit

At the end of the migration, the commit message body lists every shift note as a single table:

```
| Row | File                                | Class | Count |
|-----|-------------------------------------|-------|-------|
| 8   | syntheticGenerator.test.ts          | (i)   | 4     |
| 11  | ruleEngine/fixtureProfiles.test.ts  | (i)   | 7     |
| 11  | ruleEngine/fixtureProfiles.test.ts  | (iii) | 2     |
| 13  | ruleEngine/realBankIntegrationTests | (i)   | 11    |
| ... | ...                                 | ...   | ...   |
```

If the `(ii)` column is non-zero in the final commit, the refactor is **not done** — factory has a bug that shipped.

## 7. Failure modes & how we'd spot them

Seven known risks. Each has a **symptom** (what you'd see), a **detection backstop** (how we catch it before commit), and a **blast radius** (who it hurts). Ordered by severity — mode #1 is the one most likely to waste a day.

### FM-1 · Factory produces a shape no real DSA journey could produce

**Symptom:** Rule-engine outputs diverge from curated-fixture outputs on tests in §5d (rows 11–14) in ways that §6 Q1/Q2 can't cleanly classify — i.e. the new shape isn't "archetype was wrong" (because the archetype shape was also reachable), and it isn't "stable upstream input change" (because no input actually changed). The factory is simply producing invalid combinations.

**Detection backstop:** **Pre-migration snapshot lock.** Before any rewrite lands, take a JSON snapshot of `HL-NEW-SAL-CLEAN` (the simplest curated scenario) and commit it as a reference fixture. First factory test asserts `toEqual(snapshot)` — any drift is caught in isolation, before downstream tests amplify it.

**Blast radius:** Row 11 onward — potentially invalidates every rule-engine assertion. Cost: a day's debugging per cascade. **This is the single highest-cost failure mode.**

### FM-2 · Journey player's visibility gate disagrees with production `visibility.ts`

**Symptom:** A question that's visible in the real form is skipped by the journey player (or vice versa) because the player has its own copy of the visibility logic that drifted, OR because `visibility.ts`'s `!=`/`!==` override (CLAUDE.md Pitfall #1) isn't respected.

**Detection backstop:** **Journey player reuses `isQuestionVisible()` directly** from `src/lib/server/formEngine/visibility.ts` — no re-implementation. A single-line unit test asserts `journeyPlayer` uses the imported symbol by reference (`expect(journeyPlayer.visibilityFn).toBe(isQuestionVisible)`). If someone ever extracts a local copy, this test fails on the next run.

**Blast radius:** Every journey built by the factory. Because this is a **systemic** bug, not a per-scenario bug, it shows up as uniform regression on `formGapReport.test.ts` coverage (row 10) — which is why row 10 is gated as a blocker, not a shift-note.

### FM-3 · Determinism breaks between seeds

**Symptom:** `generateAllProfiles(42)` produces a different output hash on two identical runs, OR across two commits that shouldn't affect output.

**Detection backstop:** **Pre-refactor snapshot hash** on `generateAllProfiles(42)` output, asserted in `syntheticGenerator.test.ts` before migration begins. Post-refactor, the hash WILL change (archetype vs. schema walk produces different shapes — see Row 3 in §5). The shift note records the **new** hash, and a second assertion locks **that** hash forever. Any future change to seed logic, PRNG, or journey pool must update the hash explicitly — no silent drift.

**Blast radius:** Downstream consumers of `syntheticProfiles.ts` (Row 5) — synthetic rule-engine testing via admin dashboard. Non-test runtime failure would be subtle (500 profiles just look "different"). Hash assertion is the only guard.

### FM-4 · `$lib/server/*` boot-time cost blows up vitest startup

**Symptom:** `pnpm test:unit` cold-start time goes from ~15s to ~45s because the factory's first import chain drags `schemaLoader.ts` (and its deep-frozen cache) into every test file, not just the ones that need it.

**Detection backstop:** **Composer-first default.** The factory imports from `$lib/config/{loanType}/composer.ts` (pure TS, client-safe, no deep-freeze cost). `$lib/server/formEngine/visibility.ts` is imported, but visibility is a pure function — no transitive schema loading. `schemaLoader.ts` is avoided entirely unless a downstream consumer explicitly needs its cached view. Stage-1 spike measures `time pnpm test:unit --run schemaAlignment.test.ts` before and after to confirm.

**Blast radius:** Developer friction only (no correctness impact), but big enough friction to kill the refactor's adoption.

### FM-5 · Journey declarations drift from schema over time

**Symptom:** A schema question gets renamed or its `bindsTo` changes. The journey declaration still references the old key. Factory silently generates a payload where that answer is missing. Tests pass (because the downstream engine tolerates the absence), but the real form would have required it.

**Detection backstop:** **Schema-round-trip assertion.** Every journey's `page()` step in `journeys/{loanType}.ts` is validated against the loaded schema at module load time — any `pageId` or `bindsTo` key not present in the schema throws a descriptive error. This is the fixture-factory's equivalent of the existing `schemaAlignment.test.ts`. Cost: ~30 LOC in `journeyHarness.ts`; value: impossible to let schema drift go undetected.

**Blast radius:** Silent — affects every test that uses the drifted journey. Without the round-trip assert, this is the failure mode most likely to reach production.

### FM-6 · Branch-switch journey step leaves data no real session would retain

**Symptom:** A journey with a branch-switch step (employment type flipped self_employed → salaried) produces a payload where both self-employed AND salaried fields are populated. The S77c/S77d submission filter is supposed to strip this, but if the journey player mutates state instead of accumulating a strict superset, the filter's input is already wrong.

**Detection backstop:** **Journey player is append-only by contract.** All answer writes go through a reducer that NEVER deletes keys — it only adds or overwrites. A unit test asserts: given a 2-step journey (`{employmentType: 'self_employed', ...}` → `{employmentType: 'salaried', ...}`), the end-state contains BOTH `businessVintage` (from step 1) AND the salaried-branch keys (from step 2). The submission filter's job is to strip `businessVintage` on output — NOT the journey player's.

**Blast radius:** Phase 1.6 regression tests (Row 16) rely on this exact shape. If the journey player pre-strips, Row 16 can't exercise the filter.

### FM-7 · Per-loan-type journey files diverge on helper usage

**Symptom:** `journeys/homeLoan.ts` uses `fromPool(salariedApplicants)` while `journeys/personalLoan.ts` inlines applicant data directly. Over months, helpers stop being used consistently, journeys get harder to diff, and the "single-source-of-truth" promise erodes.

**Detection backstop:** **Soft** — an ESLint rule (or a `*.test.ts` that parses each journey file's AST) that flags inline applicant objects >5 keys deep outside of `data-pools/`. Deferred to post-commit polish; not blocking.

**Blast radius:** Long-term maintainability only. Current-commit correctness is unaffected.

### Summary table

| FM | Failure mode | Detected by | Blast radius |
|---|---|---|---|
| 1 | Factory shape ≠ real-journey shape | Pre-migration JSON snapshot lock on `HL-NEW-SAL-CLEAN` | Rows 11–16; ~1 day per cascade |
| 2 | Player visibility drifts from `visibility.ts` | By-reference import assertion | Systemic; row 10 coverage regression |
| 3 | Determinism breaks | Seeded-output hash assertion | Row 5 (non-test runtime) |
| 4 | `$lib/server/*` boot cost | Stage-1 cold-start timing | Developer friction only |
| 5 | Journey ↔ schema drift | Schema-round-trip assert at module load | Silent; every drifted journey |
| 6 | Branch-switch pre-strips data | Append-only reducer contract + unit test | Row 16 (Phase 1.6) |
| 7 | Helper usage diverges across loan types | Soft lint rule (post-commit) | Long-term maintainability |

## 8. Sequencing checklist

Eight steps. Each step's acceptance criterion is a **binary question** — either it's met or the step isn't done. No partial credit, no "mostly". Steps 3–7 are bilaterally sequenced: 3 must complete before 4, 4 before 5, etc. Only step 1 and step 2 can overlap (spec can be refined while user reviews the previous section).

### Step 1 — Spec-first (this document)

**Action:** Author `docs/specs/FIXTURE-FACTORY-SPEC.md` end-to-end (§§1–9) before any code change.

**Acceptance:** All 9 sections populated with concrete content (not stubs). `§2 public API freeze` enumerates every exported symbol that must survive the refactor. `§5 consumer map` has exactly 16 rows.

**Done when:** Spec file passes a self-read — opening it cold and being able to start implementation on Monday without asking any questions.

### Step 2 — User gate

**Action:** Walk Prashant through §§1–9 one section at a time. Each section gets explicit sign-off before the next opens.

**Acceptance:** Every section annotated as "approved" by name in conversation history. Any rejected section is revised and re-gated.

**Done when:** §9 (definition of done) is approved and no earlier section has outstanding revisions.

### Step 3 — Implement factory internals

**Action:** Create the 5 factory files per §4a (`journeyTypes.ts`, `journeyHarness.ts`, `journeyPlayer.ts`, `payloadAssembler.ts`, `schemaFixtureFactory.ts`) plus 6 per-loan-type journey files per §4b (`journeys/homeLoan.ts`, ..., `journeys/professionalLoan.ts`, `journeys/index.ts` barrel). Optional 7th: `journeys/edgeCases.ts` for the 12 EDGE-* scenarios.

**Acceptance:**
- All 5 factory internals compile clean (`pnpm check`).
- `journeyPlayer.ts` imports `isQuestionVisible` **by reference** from `$lib/server/formEngine/visibility.ts` (FM-2 backstop in place).
- Schema round-trip assert (FM-5) runs at module load and passes for all 6 loan types.
- Pre-migration snapshot of `HL-NEW-SAL-CLEAN` (FM-1 backstop) committed as a reference fixture.
- No existing consumer (§5 rows 5–16) yet imports from the new factory — implementation is dark-launched.

**Done when:** `pnpm test:unit --run schemaFixtureFactory.test.ts` passes (new test file), and no other test file has changed.

### Step 4 — Rewrite in place (§5a, rows 1–4)

**Action:** Replace internals of `formPathScenarios.ts`, `fixtureProfiles.ts`, `syntheticGenerator.ts`, `formPathAuditor.ts` with journey-sourced implementations. Public exports stay byte-identical.

**Acceptance:**
- `git diff src/lib/testing/scenarios/formPathScenarios.ts` shows rewritten body, identical exports.
- Same for the other 3 files.
- `pnpm test:unit` passes with zero assertion failures (tests consume via unchanged public API — nothing should have moved yet).
- `generateAllProfiles(42)` hash snapshot test: **old hash asserted before this step** (to lock in pre-state), **new hash asserted after** (to lock in post-state). Commit log records the hash transition.

**Done when:** `pnpm test:unit` pass count matches pre-Step-3 baseline exactly. Any drop = Stop.

### Step 5 — Migrate consumers low → high risk (§5b + §5c + §5d, rows 5–15)

**Action:** Walk rows 5 → 15 sequentially. Each row: run affected test, classify any failure per §6 decision tree, either update with shift note (classifications i/iii) or pause and fix the factory (classification ii).

**Acceptance per row:**
- Affected test passes (either unchanged or with shift note).
- Any (ii) factory-is-wrong finding paused migration — and the factory fix landed in a separate commit-safe stage before resuming.
- Shift notes recorded inline per §6b template.

**Acceptance overall:**
- `pnpm test:unit` total pass count within 3% of pre-Step-3 baseline.
- Zero (ii) classifications remain open.

**Done when:** Row 15 passes and the aggregate shift-note table (§6e) has been compiled.

### Step 6 — Migrate Phase 1.6 (§5e, row 16)

**Action:** Rewrite `evaluateAndPersistFilter.test.ts` to consume factory outputs instead of inline `makeFormState` + `guarantorOnlyApplicantWithStaleIncome` helpers. 6-loan breadth sweep → 6 curated journeys. Staleness variants → journey branch-switch steps.

**Acceptance:**
- All 9 Phase 1.6 tests pass.
- Inline fixture helpers (`makeFormState`, `guarantorOnlyApplicantWithStaleIncome`) deleted from the test file (they move into the factory as journey helpers, or disappear entirely if superseded).
- `THROWAWAY FIXTURES` banner at top of file removed — the comment is no longer accurate.

**Done when:** The S77d Phase 1.6 regression surface passes on factory-sourced inputs with no inline fixtures remaining.

### Step 7 — Archive dead files

**Action:** Per §4e — move `generators/archetypes/archetypeTemplates.ts` and `archetypeHelpers.ts` to `generators/_archive/archetypes/`. `rmdir` the now-empty `archetypes/` directory. Add `generators/_archive/README.md` (~30 LOC) mirroring the S77c precedent in `src/lib/stores/_archive/`.

**Acceptance:**
- `ls src/lib/testing/generators/archetypes/` returns "No such file or directory" (dir removed).
- `ls src/lib/testing/generators/_archive/archetypes/` shows both archived files + `_archive/README.md`.
- `pnpm check` still passes (tsconfig's `**/_archive/**` exclude keeps archived code out of compilation).
- No test file in `src/lib/testing/` imports from `archetypes/` — verified via `grep -r "archetypes/" src/`.

**Done when:** Archive exists, originals gone, tsconfig exclude holds, no live import references `archetypes/`.

### Step 8 — Host-verify + update docs + commit

**Action:**
- Host verify: `pnpm dev` up, admin dashboard `/api/admin/policies/seed` endpoint called, all 6 synthetic rule-engine tabs render.
- Update docs: `docs/SESSION-HANDOFF.md` new entry under S77e, `docs/DEVELOPMENT-PLAN.md` marks S77e complete, `docs/CHANGELOG.md` appends dated entry.
- Commit: **single commit** on `main` with message `refactor(testing): S77e schema-driven fixture factory (wide scope)` and body containing the §6e aggregate shift-note table.

**Acceptance:**
- `pnpm check && pnpm test:unit` both green at HEAD.
- `git log -1 --stat` shows the expected file movements (new factory files, rewritten consumers, archived archetypes).
- Commit message body's `(ii)` column is zero.

**Done when:** HEAD is clean, on `main`, with all three docs updated.

---

### Cross-step invariants (true at every step boundary)

- `pnpm check` passes (TypeScript clean).
- `pnpm test:unit` pass count within 3% of Step 2 baseline (FM-1 guard).
- No `console.log` / `console.warn` left in production code paths (Pino-only per CLAUDE.md rule #11).
- No import from `archetypes/` in non-archived files (steps 4+).
- No `fetch` at module scope (CLAUDE.md Pitfall #4).

## 9. Definition of done

Adapted from `NEXT-SESSION-PROMPT.md` with three corrections: (a) factory is 5 internals + 6 journey files, not 4; (b) 16 consumers, not 15 (see §5 drift note); (c) archive-not-delete policy applies — commit message no longer needs to call out an archive exception.

S77e is shippable when **every** box below is green. Any open box = not done.

- [ ] `docs/specs/FIXTURE-FACTORY-SPEC.md` exists with user sign-off on all 9 sections recorded in conversation history.
- [ ] `src/lib/testing/factory/` (or equivalent path per §4a) exists with the 5 internal files: `journeyTypes.ts`, `journeyHarness.ts`, `journeyPlayer.ts`, `payloadAssembler.ts`, `schemaFixtureFactory.ts`.
- [ ] `src/lib/testing/journeys/` exists with 6 per-loan-type files (`homeLoan.ts`, `lapLoan.ts`, `plotLoan.ts`, `personalLoan.ts`, `businessLoan.ts`, `professionalLoan.ts`) + `index.ts` barrel. Optional: `edgeCases.ts` for the 12 EDGE-* scenarios.
- [ ] `fixtureProfiles.ts` / `formPathScenarios.ts` / `syntheticGenerator.ts` / `formPathAuditor.ts` have new internals; **all prior public exports present** (51 in `fixtureProfiles`, 37 scenario IDs in `formPathScenarios`, same `generateAllProfiles` signature in `syntheticGenerator`, same 5 public functions in `formPathAuditor`) and producing equivalent-or-improved output.
- [ ] `archetypeTemplates.ts` + `archetypeHelpers.ts` **archived to** `src/lib/testing/generators/_archive/archetypes/`; empty `archetypes/` directory removed; new `_archive/README.md` present per §4e.
- [ ] All 16 consumers migrated per §5, with shift notes per §6b inline in each affected test. Aggregate shift-note table per §6e present in the commit message body.
- [ ] Phase 1.6 integration tests (`evaluateAndPersistFilter.test.ts`, row 16) rewritten against the factory; `THROWAWAY FIXTURES` banner and inline `makeFormState`/`guarantorOnlyApplicantWithStaleIncome` helpers removed.
- [ ] All 7 failure modes (§7) have their detection backstops in place and passing: FM-1 snapshot lock, FM-2 by-reference import assertion, FM-3 seeded-hash lock, FM-5 schema round-trip assert, FM-6 append-only reducer unit test. (FM-4 and FM-7 are observability-only, no assertion required.)
- [ ] `pnpm check` — 0 errors, 1 pre-existing `MonthYearModal.svelte:51` warning only. Archived `_archive/**` code excluded from compilation per tsconfig.
- [ ] `pnpm test:unit` — all passing. Test count within 3% of Step-2 baseline (~7,015 tests). Document any net delta in the commit body.
- [ ] `pnpm test:unit --run formGapReport` — coverage meaningfully up from the 22% baseline. Document the new coverage % in the commit message.
- [ ] `pnpm build` — clean (adapter-auto advisory is fine).
- [ ] Docs updated: `docs/SESSION-HANDOFF.md` S77e completion block, `docs/DEVELOPMENT-PLAN.md` COMPLETE entry, `docs/CHANGELOG.md` top entry, `docs/PAYLOAD_DOCUMENTATION.md` fixture-factory reference in §Tests.
- [ ] Single commit on `main`: `refactor(testing): S77e schema-driven fixture factory (wide scope)`. Commit body contains the §6e aggregate shift-note table; `(ii) factory-is-wrong` column is **zero**.

---

## Open questions for Prashant (before deepening sections)

These are the material choices where getting it wrong now costs rework later:

1. **Schema import surface** — composer layer (`$lib/config/{loan}/composer.ts`) vs server schemaLoader (`$lib/server/formEngine/schemaLoader.ts`)? Composer is client-safe and cheaper to boot in vitest; schemaLoader is deep-frozen-cached but carries the server-only directive. Recommendation pending evidence — will survey boot cost during Stage 1 spike before locking.
2. **Scenario curation model** — do the 25 curated scenarios continue to live as hand-named entries (`HL-NEW-SAL-CLEAN`, etc.) with hand-written branch-selector configs, or does the factory generate a broader set from which we pick 25 by tag? (Lean: keep 25 curated entries, each with explicit selectors — makes each scenario's intent readable and diffable when the schema drifts.)
3. **Determinism source-of-truth** — do we keep the current `SeededRandom` (Lehmer) in `syntheticGenerator.ts` or switch to a stronger PRNG? (Lean: keep Lehmer — changing it re-hashes the 500-profile output and breaks seed-based snapshot assertions for no functional win.)
4. **Staleness injector API shape** — per-test opt-in (`{ injectStaleBranch: 'self_employed' }`) vs composable overlay (`withStaleness(scenario, 'self_employed')`)? (Lean: composable overlay — keeps the 25 curated entries untouched and makes Phase 1.6 tests read more declaratively.)
